import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { validateLoadedProject } from '../builder/validate.ts'
import type { LoadedProject } from '../core/types.ts'

const temporaryDirectories: string[] = []

async function projectWithOverlap(allowOverlap = false): Promise<LoadedProject> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'band10-overlap-'))
  temporaryDirectories.push(directory)
  await writeFile(path.join(directory, 'square.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#fff"/></svg>')
  return {
    directory,
    manifest: {
      formatVersion: 1,
      id: '123456789',
      name: 'Overlap test',
      author: 'Test',
      version: '1.0.0',
      device: 'xiaomi-smart-band-10',
      preview: 'generated',
      output: 'overlap-test',
      compiler: { target: 'native', imageCompression: true },
    },
    layout: {
      formatVersion: 1,
      canvas: { width: 212, height: 520, clip: 'pill' },
      assets: { digitSets: {} },
      normal: {
        background: '#000000',
        widgets: [
          { id: 'left', type: 'image', asset: 'square.svg', x: 20, y: 20, z: 1 },
          { id: 'right', type: 'image', asset: 'square.svg', x: 30, y: 30, z: 2, allowOverlap },
        ],
      },
    },
  }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('widget collision validation', () => {
  it('reports accidental geometric overlap', async () => {
    const report = await validateLoadedProject(await projectWithOverlap())
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'WIDGET_OVERLAP', message: expect.stringContaining('10×10 px') }),
    ]))
  })

  it('requires an explicit allowOverlap opt-out for decorative layering', async () => {
    const report = await validateLoadedProject(await projectWithOverlap(true))
    expect(report.issues.some((issue) => issue.code === 'WIDGET_OVERLAP')).toBe(false)
  })
})