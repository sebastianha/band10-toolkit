import { describe, expect, it } from 'vitest'
import { decodeRleV1, decodeRleV2, encodeRleV1, encodeRleV2 } from '../parser/rle.ts'

function deterministicBytes(length: number): Uint8Array {
  let state = 0x12345678
  return Uint8Array.from({ length }, (_, index) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return index % 31 < 12 ? (index >>> 5) & 0xff : state & 0xff
  })
}

describe('RLE v1', () => {
  it.each([2, 3, 4])('round-trips fixed %i-byte pixels', (bytesPerPixel) => {
    const input = deterministicBytes(1024 * bytesPerPixel)
    const encoded = encodeRleV1(input, bytesPerPixel)
    expect(decodeRleV1(encoded, input.length, bytesPerPixel)).toEqual(input)
  })

  it('rejects malformed pixel alignment', () => {
    expect(() => encodeRleV1(Uint8Array.of(1, 2, 3), 2)).toThrow(/not divisible/)
  })

  it('rejects a truncated packet', () => {
    expect(() => decodeRleV1(Uint8Array.of(4, 1), 8, 2)).toThrow(/Truncated/)
  })
})

describe('RLE v2', () => {
  it.each([0, 1, 2, 3, 126, 127, 128, 4096])('round-trips %i index bytes', (length) => {
    const input = deterministicBytes(length)
    const encoded = encodeRleV2(input)
    expect(decodeRleV2(encoded, input.length)).toEqual(input)
  })

  it('compresses long palette-index runs', () => {
    const input = new Uint8Array(500).fill(7)
    expect(encodeRleV2(input).length).toBeLessThan(20)
    expect(decodeRleV2(encodeRleV2(input), input.length)).toEqual(input)
  })

  it('rejects zero-length packets', () => {
    expect(() => decodeRleV2(Uint8Array.of(0), 1)).toThrow(/zero-length/)
  })
})