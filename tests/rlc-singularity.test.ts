import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadProject, packageProject, validateProject } from '../builder/index.ts'
import { inspectWatchFace } from '../parser/index.ts'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const example = path.join(repositoryRoot, 'examples', 'rlc-singularity')

describe('RLC Singularity animated face', () => {
  it('has a warning-free RLC animation and complete date/health bindings', async () => {
    const report = await validateProject(example)
    expect(report.valid).toBe(true)
    expect(report.issues).toEqual([])
    expect(report.stats.widgets).toBe(16)
    expect(report.stats.assets).toBe(141)

    const project = await loadProject(example)
    const animation = project.layout.normal.widgets.find((widget) => widget.id === 'rlc-assembly')
    expect(animation).toMatchObject({ type: 'animation', intervalMs: 60, repeat: 0 })
    if (!animation || animation.type !== 'animation') throw new Error('RLC animation is missing')
    expect(animation.frames).toHaveLength(48)

    const nepaliDate = project.layout.normal.widgets.find((widget) => widget.id === 'bs-date')
    expect(nepaliDate).toMatchObject({ type: 'image-list', source: 'day', fallback: 'exact' })
    if (!nepaliDate || nepaliDate.type !== 'image-list') throw new Error('Nepali date lookup is missing')
    expect(nepaliDate.items).toHaveLength(31)
    expect(project.layout.normal.widgets.map((widget) => widget.id)).not.toEqual(expect.arrayContaining([
      'title', 'ad-label', 'ad-year', 'bs-label',
    ]))
  })

  it('packages deterministic active and AOD records with required firmware sources', async () => {
    const first = await packageProject(example, { target: 'native' })
    const firstBytes = await readFile(first.facePath)
    const second = await packageProject(example, { target: 'native' })
    const secondBytes = await readFile(second.facePath)
    expect(secondBytes).toEqual(firstBytes)

    const inspection = inspectWatchFace(new Uint8Array(secondBytes))
    expect(inspection.header).toMatchObject({
      id: '260718011',
      name: 'RLC SINGULARITY',
      faceCount: 2,
      deviceFlags: 0x800,
    })
    expect(inspection.warnings).toEqual([])
    expect(inspection.faces.map((face) => face.elements.length)).toEqual([12, 4])
    const bindings = inspection.faces.flatMap((face) => face.elements.map((element) => element.dataSourceName).filter(Boolean))
    expect(bindings).toEqual(expect.arrayContaining(['hour', 'minute', 'month', 'day', 'steps', 'battery']))
    expect(bindings).not.toContain('year')
  }, 30_000)
})
