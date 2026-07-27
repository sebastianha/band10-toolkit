import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProject, renderPreviewPng } from '../builder/index.ts'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const projectDirectory = path.join(repositoryRoot, 'examples', 'minimal-amoled')
const outputDirectory = path.join(repositoryRoot, 'docs', 'screenshots')
const build = await buildProject(projectDirectory)
await mkdir(outputDirectory, { recursive: true })
await copyFile(build.previewPath, path.join(outputDirectory, 'active-watchface.png'))
if (!build.project.layout.aod?.enabled) throw new Error('Example AOD is not enabled')
await renderPreviewPng(
  build.project,
  build.project.layout.aod,
  build.aodAssets,
  path.join(outputDirectory, 'aod-watchface.png'),
)
console.log(`Rendered active/AOD screenshots in ${outputDirectory}`)