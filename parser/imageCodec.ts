import sharp from 'sharp'
import { assertRange, readU16LE, readU32LE, writeU16LE, writeU32LE } from './bytes.ts'
import { decodeRleV1, decodeRleV2, encodeRleV1, encodeRleV2 } from './rle.ts'

export const COMPRESSED_IMAGE_MAGIC = Uint8Array.of(0xe0, 0x21, 0xa5, 0x5a)
export const IMAGE_HEADER_SIZE = 12
export const PALETTE_BYTES = 256 * 4

export interface EncodedImage {
  block: Uint8Array
  width: number
  height: number
  sign: number
  compressed: boolean
  colors: number
}

export interface DecodedImage {
  rgba: Uint8Array
  width: number
  height: number
  sign: number
  encodedLength: number
  compressed: boolean
}

function colorKey(data: Uint8Array, offset: number): number {
  return (
    ((data[offset + 3] ?? 0) << 24)
    | ((data[offset] ?? 0) << 16)
    | ((data[offset + 1] ?? 0) << 8)
    | (data[offset + 2] ?? 0)
  ) >>> 0
}

function rgbaToBgra(rgba: Uint8Array): Uint8Array {
  const output = new Uint8Array(rgba.length)
  for (let offset = 0; offset < rgba.length; offset += 4) {
    output[offset] = rgba[offset + 2] ?? 0
    output[offset + 1] = rgba[offset + 1] ?? 0
    output[offset + 2] = rgba[offset] ?? 0
    output[offset + 3] = rgba[offset + 3] ?? 0
  }
  return output
}

function indexedPixels(rgba: Uint8Array): { data: Uint8Array; colors: number } | undefined {
  const palette = new Map<number, number>()
  const indices = new Uint8Array(rgba.length / 4)

  for (let offset = 0, pixel = 0; offset < rgba.length; offset += 4, pixel += 1) {
    const key = colorKey(rgba, offset)
    let index = palette.get(key)
    if (index === undefined) {
      if (palette.size === 256) return undefined
      index = palette.size
      palette.set(key, index)
    }
    indices[pixel] = index
  }

  const output = new Uint8Array(PALETTE_BYTES + indices.length)
  for (const [key, index] of palette) {
    const offset = index * 4
    output[offset] = key & 0xff
    output[offset + 1] = (key >>> 8) & 0xff
    output[offset + 2] = (key >>> 16) & 0xff
    output[offset + 3] = (key >>> 24) & 0xff
  }
  output.set(indices, PALETTE_BYTES)
  return { data: output, colors: palette.size }
}

function compressedPayload(raw: Uint8Array, bytesPerPixel: number, palette: boolean): Uint8Array {
  const encoded = palette ? encodeRleV2(raw) : encodeRleV1(raw, bytesPerPixel)
  const payload = new Uint8Array(8 + encoded.length)
  payload.set(COMPRESSED_IMAGE_MAGIC)
  writeU32LE(payload, 4, (raw.length << 4) | bytesPerPixel)
  payload.set(encoded, 8)
  return payload
}

async function readRgba(path: string): Promise<{ rgba: Uint8Array; width: number; height: number }> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  if (info.channels !== 4) throw new Error(`Expected RGBA data for ${path}; received ${info.channels} channels`)
  return { rgba: new Uint8Array(data), width: info.width, height: info.height }
}

function encodeRgbaBlock(rgba: Uint8Array, width: number, height: number, compress: boolean, listCount = 0): EncodedImage {
  const indexed = indexedPixels(rgba)
  const sign = indexed ? 0x10 : 0
  const bytesPerPixel = indexed ? 1 : 4
  const raw = indexed?.data ?? rgbaToBgra(rgba)
  const payload = compress ? compressedPayload(raw, bytesPerPixel, Boolean(indexed)) : raw
  const header = new Uint8Array(IMAGE_HEADER_SIZE)
  header[0] = sign
  if (listCount === 0 && compress) header[1] = 4
  writeU16LE(header, 4, width)
  writeU16LE(header, 6, height)
  writeU32LE(header, 8, payload.length)
  const block = new Uint8Array(header.length + payload.length)
  block.set(header)
  block.set(payload, header.length)
  return { block, width, height, sign, compressed: compress, colors: indexed?.colors ?? 257 }
}

export async function encodeImageFile(path: string, compress = true): Promise<EncodedImage> {
  const image = await readRgba(path)
  return encodeRgbaBlock(image.rgba, image.width, image.height, compress)
}

export async function encodeImageListFiles(paths: string[], compress = true): Promise<EncodedImage> {
  if (paths.length === 0 || paths.length > 255) throw new Error('Image lists must contain 1–255 images')
  const images = await Promise.all(paths.map(readRgba))
  const first = images[0]
  if (!first) throw new Error('Image list is empty')
  for (const [index, image] of images.entries()) {
    if (image.width !== first.width || image.height !== first.height) {
      throw new Error(`Image list item ${index} is ${image.width}×${image.height}; expected ${first.width}×${first.height}`)
    }
  }

  const indexed = images.every((image) => indexedPixels(image.rgba) !== undefined)
  const sign = indexed ? 0x10 : 0
  const payloads = images.map((image) => {
    const palette = indexed ? indexedPixels(image.rgba) : undefined
    const raw = palette?.data ?? rgbaToBgra(image.rgba)
    return compress ? compressedPayload(raw, indexed ? 1 : 4, indexed) : raw
  })
  const tableLength = compress ? payloads.length * 4 : 0
  const payloadLength = payloads.reduce((total, payload) => total + payload.length, tableLength)
  const block = new Uint8Array(IMAGE_HEADER_SIZE + payloadLength)
  block[0] = sign
  block[1] = images.length
  if (compress) block[2] = 4
  writeU16LE(block, 4, first.width)
  writeU16LE(block, 6, first.height)
  writeU32LE(block, 8, payloadLength)
  let offset = IMAGE_HEADER_SIZE + tableLength
  for (const [index, payload] of payloads.entries()) {
    if (compress) writeU32LE(block, IMAGE_HEADER_SIZE + index * 4, payload.length)
    block.set(payload, offset)
    offset += payload.length
  }

  return {
    block,
    width: first.width,
    height: first.height,
    sign,
    compressed: compress,
    colors: indexed ? Math.max(...images.map((image) => indexedPixels(image.rgba)?.colors ?? 0)) : 257,
  }
}

function hasCompressedMagic(buffer: Uint8Array, offset: number): boolean {
  return COMPRESSED_IMAGE_MAGIC.every((value, index) => buffer[offset + index] === value)
}

function decodeRawPixels(raw: Uint8Array, sign: number, width: number, height: number, bytesPerPixel: number): Uint8Array {
  const pixelCount = width * height
  const rgba = new Uint8Array(pixelCount * 4)

  if (sign === 0x10 || bytesPerPixel === 1) {
    if (raw.length < PALETTE_BYTES + pixelCount) throw new Error('Indexed image payload is shorter than its palette and pixels')
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const paletteOffset = (raw[PALETTE_BYTES + pixel] ?? 0) * 4
      const output = pixel * 4
      rgba[output] = raw[paletteOffset + 2] ?? 0
      rgba[output + 1] = raw[paletteOffset + 1] ?? 0
      rgba[output + 2] = raw[paletteOffset] ?? 0
      rgba[output + 3] = raw[paletteOffset + 3] ?? 0
    }
    return rgba
  }

  if (bytesPerPixel === 4) {
    if (raw.length < pixelCount * 4) throw new Error('BGRA image payload is truncated')
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const input = pixel * 4
      rgba[input] = raw[input + 2] ?? 0
      rgba[input + 1] = raw[input + 1] ?? 0
      rgba[input + 2] = raw[input] ?? 0
      rgba[input + 3] = raw[input + 3] ?? 0
    }
    return rgba
  }

  if (bytesPerPixel === 3 || bytesPerPixel === 2) {
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const input = pixel * bytesPerPixel
      const low = raw[input] ?? 0
      const high = raw[input + 1] ?? 0
      const output = pixel * 4
      rgba[output] = high & 0xf8
      rgba[output + 1] = (((high & 0x07) << 5) | ((low & 0xe0) >>> 3)) & 0xfc
      rgba[output + 2] = (low & 0x1f) << 3
      rgba[output + 3] = bytesPerPixel === 3 ? (raw[input + 2] ?? 255) : 255
    }
    return rgba
  }

  throw new Error(`Unsupported image bytes-per-pixel value ${bytesPerPixel}`)
}

function decodePayload(buffer: Uint8Array, offset: number, length: number, sign: number, width: number, height: number): { rgba: Uint8Array; compressed: boolean } {
  assertRange(buffer, offset, length, 'image payload')
  let raw: Uint8Array
  let bytesPerPixel: number
  let compressed = false

  if (length >= 8 && hasCompressedMagic(buffer, offset)) {
    const info = readU32LE(buffer, offset + 4)
    bytesPerPixel = info & 0x0f
    const expectedLength = info >>> 4
    const encoded = buffer.subarray(offset + 8, offset + length)
    raw = sign === 0x10 || bytesPerPixel === 1
      ? decodeRleV2(encoded, expectedLength)
      : decodeRleV1(encoded, expectedLength, bytesPerPixel)
    compressed = true
  } else {
    raw = buffer.subarray(offset, offset + length)
    bytesPerPixel = sign === 6 ? 3 : sign === 3 ? 2 : sign === 0x10 ? 1 : 4
  }

  return { rgba: decodeRawPixels(raw, sign, width, height, bytesPerPixel), compressed }
}

export function decodeImageBlock(buffer: Uint8Array, offset: number): DecodedImage {
  assertRange(buffer, offset, IMAGE_HEADER_SIZE, 'image header')
  const sign = buffer[offset] ?? 0
  const width = readU16LE(buffer, offset + 4)
  const height = readU16LE(buffer, offset + 6)
  const encodedLength = readU32LE(buffer, offset + 8)
  if (width === 0 || height === 0) throw new Error(`Invalid image dimensions ${width}×${height} at offset ${offset}`)
  const decoded = decodePayload(buffer, offset + IMAGE_HEADER_SIZE, encodedLength, sign, width, height)
  return { ...decoded, width, height, sign, encodedLength: IMAGE_HEADER_SIZE + encodedLength }
}

export function decodeImageListBlock(buffer: Uint8Array, offset: number): DecodedImage[] {
  assertRange(buffer, offset, IMAGE_HEADER_SIZE, 'image-list header')
  const sign = buffer[offset] ?? 0
  const count = buffer[offset + 1] ?? 0
  const compressed = buffer[offset + 2] === 4 || buffer[offset + 2] === 8
  const width = readU16LE(buffer, offset + 4)
  const height = readU16LE(buffer, offset + 6)
  const totalLength = readU32LE(buffer, offset + 8)
  if (count === 0 || width === 0 || height === 0) throw new Error(`Invalid image list at offset ${offset}`)
  assertRange(buffer, offset + IMAGE_HEADER_SIZE, totalLength, 'image-list payload')

  const lengths = compressed
    ? Array.from({ length: count }, (_, index) => readU32LE(buffer, offset + IMAGE_HEADER_SIZE + index * 4))
    : Array.from({ length: count }, () => Math.floor(totalLength / count))
  let payloadOffset = offset + IMAGE_HEADER_SIZE + (compressed ? count * 4 : 0)
  return lengths.map((length) => {
    const decoded = decodePayload(buffer, payloadOffset, length, sign, width, height)
    payloadOffset += length
    return { ...decoded, width, height, sign, encodedLength: length }
  })
}

export async function writeDecodedPng(image: DecodedImage, outputPath: string): Promise<void> {
  await sharp(Buffer.from(image.rgba), {
    raw: { width: image.width, height: image.height, channels: 4 },
  }).png().toFile(outputPath)
}