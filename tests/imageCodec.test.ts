import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { afterEach, describe, expect, it } from 'vitest'
import { decodeImageBlock, decodeImageListBlock, encodeImageFile, encodeImageListFiles } from '../parser/imageCodec.ts'

const temporaryDirectories: string[] = []

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'band10-codec-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function writeRgba(pathName: string, rgba: number[], width: number, height: number): Promise<void> {
  await sharp(Buffer.from(rgba), { raw: { width, height, channels: 4 } }).png().toFile(pathName)
}

describe('Band 10 image blocks', () => {
  it('preserves BGRA palette channel order and alpha', async () => {
    const directory = await temporaryDirectory()
    const source = path.join(directory, 'palette.png')
    const pixels = [
      255, 0, 0, 255,
      0, 255, 0, 128,
      0, 0, 255, 64,
      255, 255, 255, 0,
    ]
    await writeRgba(source, pixels, 2, 2)
    const encoded = await encodeImageFile(source, true)
    expect(encoded.sign).toBe(0x10)
    const decoded = decodeImageBlock(encoded.block, 0)
    expect(decoded.width).toBe(2)
    expect(decoded.height).toBe(2)
    expect([...decoded.rgba]).toEqual(pixels)
  })

  it('encodes and decodes compressed image lists', async () => {
    const directory = await temporaryDirectory()
    const red = path.join(directory, 'red.png')
    const blue = path.join(directory, 'blue.png')
    await writeRgba(red, new Array(16).fill(0).flatMap((_, index) => index % 4 === 0 ? [255] : index % 4 === 3 ? [255] : [0]), 2, 2)
    await writeRgba(blue, [0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255], 2, 2)
    const encoded = await encodeImageListFiles([red, blue], true)
    const decoded = decodeImageListBlock(encoded.block, 0)
    expect(decoded).toHaveLength(2)
    expect([...decoded[0]!.rgba.subarray(0, 4)]).toEqual([255, 0, 0, 255])
    expect([...decoded[1]!.rgba.subarray(0, 4)]).toEqual([0, 0, 255, 255])
  })

  it('rejects inconsistent list dimensions', async () => {
    const directory = await temporaryDirectory()
    const first = path.join(directory, 'first.png')
    const second = path.join(directory, 'second.png')
    await writeRgba(first, [255, 0, 0, 255], 1, 1)
    await writeRgba(second, [0, 0, 0, 255, 0, 0, 0, 255], 2, 1)
    await expect(encodeImageListFiles([first, second])).rejects.toThrow(/expected 1×1/)
  })
})