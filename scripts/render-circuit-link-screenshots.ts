import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProject, renderPreviewPng } from '../builder/index.ts'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const projectDirectory = path.join(repositoryRoot, 'examples', 'circuit-link')
const outputDirectory = path.join(projectDirectory, 'screenshots')
const build = await buildProject(projectDirectory)

await mkdir(outputDirectory, { recursive: true })
await copyFile(build.previewPath, path.join(outputDirectory, 'active.png'))
if (!build.project.layout.aod?.enabled) throw new Error('Circuit Link AOD is not enabled')
await renderPreviewPng(
  build.project,
  build.project.layout.aod,
  build.aodAssets,
  path.join(outputDirectory, 'aod.png'),
)

console.log(`Rendered Circuit Link screenshots in ${outputDirectory}`)
