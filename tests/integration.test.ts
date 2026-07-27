import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { packageProject, validateProject } from '../builder/index.ts'
import { decodeImageBlock, decodeImageListBlock, inspectWatchFace } from '../parser/index.ts'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const example = path.join(repositoryRoot, 'examples', 'minimal-amoled')

describe('Carbon Signal end-to-end build', () => {
  it('validates the canonical project without errors', async () => {
    const report = await validateProject(example)
    expect(report.valid).toBe(true)
    expect(report.issues.filter((issue) => issue.severity === 'error')).toEqual([])
    expect(report.stats.widgets).toBe(21)
    expect(report.stats.assets).toBe(41)
  })

  it('packages, inspects, and decodes active + AOD resources', async () => {
    const result = await packageProject(example, { target: 'native' })
    const binary = new Uint8Array(await readFile(result.facePath))
    const inspection = inspectWatchFace(binary)
    expect(inspection.header).toMatchObject({
      magic: '5aa53412',
      id: '260714010',
      name: 'Carbon Signal',
      faceCount: 2,
      deviceFlags: 0x800,
    })
    expect(inspection.warnings).toEqual([])
    expect(inspection.faces.map((face) => face.elements.length)).toEqual([15, 6])

    const bindings = inspection.faces.flatMap((face) => face.elements.map((element) => element.dataSourceName).filter(Boolean))
    expect(bindings).toEqual(expect.arrayContaining(['battery', 'hour', 'minute', 'month', 'day', 'weatherCondition', 'temperatureC', 'steps', 'stepProgress', 'heartRate']))

    const preview = decodeImageBlock(binary, inspection.header.previewOffset)
    expect([preview.width, preview.height]).toEqual([212, 520])
    let singles = 0
    let lists = 0
    for (const face of inspection.faces) {
      for (const definition of face.definitions) {
        if (definition.type === 2) {
          expect(decodeImageBlock(binary, definition.offset).rgba.length).toBeGreaterThan(0)
          singles += 1
        }
        if (definition.type === 3) {
          expect(decodeImageListBlock(binary, definition.offset).length).toBeGreaterThan(0)
          lists += 1
        }
      }
    }
    expect(singles).toBe(8)
    expect(lists).toBe(7)
    expect(await readFile(result.binPath)).toEqual(await readFile(result.facePath))
  }, 30_000)
})