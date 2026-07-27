import { describe, expect, it } from 'vitest'
import { layoutSchema, manifestSchema } from '../core/schema.ts'

const manifest = {
  formatVersion: 1,
  id: '123456789',
  name: 'Test',
  author: 'Test',
  version: '1.0.0',
  device: 'xiaomi-smart-band-10',
  preview: 'generated',
  output: 'test',
  compiler: { target: 'native', imageCompression: true },
} as const

const layout = {
  formatVersion: 1,
  canvas: { width: 212, height: 520, clip: 'pill' },
  assets: { digitSets: {} },
  normal: { background: '#000000', widgets: [] },
} as const

describe('canonical schemas', () => {
  it('rejects unknown manifest keys', () => {
    expect(manifestSchema.safeParse({ ...manifest, typo: true }).success).toBe(false)
  })

  it('rejects unknown widget keys', () => {
    const withWidget = {
      ...layout,
      normal: {
        ...layout.normal,
        widgets: [{ id: 'image', type: 'image', asset: 'image.png', x: 0, y: 0, z: 0, mystery: 1 }],
      },
    }
    expect(layoutSchema.safeParse(withWidget).success).toBe(false)
  })
})