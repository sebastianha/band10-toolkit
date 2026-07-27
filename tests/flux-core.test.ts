import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { packageProject, validateProject } from '../builder/index.ts'
import { inspectWatchFace } from '../parser/index.ts'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const example = path.join(repositoryRoot, 'examples', 'flux-core')

describe('Flux Core electronics face', () => {
  it('has no clipping, overlap, or capability warnings', async () => {
    const report = await validateProject(example)
    expect(report.valid).toBe(true)
    expect(report.issues).toEqual([])
    expect(report.stats.widgets).toBe(33)
    expect(report.stats.assets).toBe(76)
  })

  it('packages deterministic active and AOD records with expected bindings', async () => {
    const first = await packageProject(example, { target: 'native' })
    const firstBytes = await readFile(first.facePath)
    const second = await packageProject(example, { target: 'native' })
    const secondBytes = await readFile(second.facePath)
    expect(secondBytes).toEqual(firstBytes)

    const inspection = inspectWatchFace(new Uint8Array(secondBytes))
    expect(inspection.header).toMatchObject({
      id: '260715010',
      name: 'Flux Core',
      faceCount: 2,
      deviceFlags: 0x800,
    })
    expect(inspection.warnings).toEqual([])
    expect(inspection.faces.map((face) => face.elements.length)).toEqual([24, 9])
    const bindings = inspection.faces.flatMap((face) => face.elements.map((element) => element.dataSourceName).filter(Boolean))
    expect(bindings).toEqual(expect.arrayContaining([
      'hour', 'minute', 'month', 'day', 'battery', 'steps', 'heartRate', 'weatherCondition', 'temperatureC',
    ]))
  }, 30_000)
})