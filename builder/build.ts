import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { LoadedProject, ValidationReport } from '../core/index.ts'
import { stageThemeAssets, type StagedAssetMap } from './assets.ts'
import { writeFprjIntermediate } from './fprj.ts'
import { writeGmfIntermediate } from './gmf.ts'
import { loadProject } from './project.ts'
import { renderPreviewPng } from './render.ts'
import { validateLoadedProject } from './validate.ts'

export interface BuildResult {
  project: LoadedProject
  report: ValidationReport
  buildDirectory: string
  previewPath: string
  fprjPath: string
  gmfPath: string
  normalAssets: StagedAssetMap
  aodAssets: StagedAssetMap
}

export async function buildProject(directory: string): Promise<BuildResult> {
  const project = await loadProject(directory)
  const report = await validateLoadedProject(project)
  if (!report.valid) {
    const errors = report.issues.filter((issue) => issue.severity === 'error').map((issue) => `${issue.code}: ${issue.message}`).join('\n')
    throw new Error(`Validation failed:\n${errors}`)
  }

  const buildDirectory = path.join(project.directory, 'build')
  await rm(buildDirectory, { recursive: true, force: true })
  await mkdir(buildDirectory, { recursive: true })
  const normalAssets = await stageThemeAssets(project, 'normal', path.join(buildDirectory, 'assets-normal'))
  const aodAssets = project.layout.aod?.enabled
    ? await stageThemeAssets(project, 'aod', path.join(buildDirectory, 'assets-aod'))
    : new Map()
  const previewPath = path.join(buildDirectory, 'preview.png')
  await renderPreviewPng(project, project.layout.normal, normalAssets, previewPath)
  const [fprjPath, gmfPath] = await Promise.all([
    writeFprjIntermediate(project, normalAssets, aodAssets, path.join(buildDirectory, 'fprj'), previewPath),
    writeGmfIntermediate(project, normalAssets, aodAssets, path.join(buildDirectory, 'gmf'), previewPath),
  ])
  await writeFile(path.join(buildDirectory, 'build-report.json'), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    device: 'o66',
    report,
    outputs: { previewPath, fprjPath, gmfPath },
  }, null, 2)}\n`)
  return { project, report, buildDirectory, previewPath, fprjPath, gmfPath, normalAssets, aodAssets }
}