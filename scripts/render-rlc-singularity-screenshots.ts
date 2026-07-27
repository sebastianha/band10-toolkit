import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProject, renderPreviewPng } from '../builder/index.ts'
import { DEFAULT_SIMULATION } from '../core/index.ts'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const projectDirectory = path.join(repositoryRoot, 'examples', 'rlc-singularity')
const outputDirectory = path.join(projectDirectory, 'screenshots')
const build = await buildProject(projectDirectory)

await mkdir(outputDirectory, { recursive: true })
const frameCount = 48
const intervalMs = 60
const peakFrame = 33
const baseTimestamp = new Date(DEFAULT_SIMULATION.dateTime).getTime()
const baseFrame = Math.abs(Math.floor(baseTimestamp / intervalMs)) % frameCount
const advance = (peakFrame - baseFrame + frameCount) % frameCount
await renderPreviewPng(
  build.project,
  build.project.layout.normal,
  build.normalAssets,
  path.join(outputDirectory, 'active.png'),
  { ...DEFAULT_SIMULATION, dateTime: new Date(baseTimestamp + advance * intervalMs).toISOString() },
)
if (!build.project.layout.aod?.enabled) throw new Error('RLC Singularity AOD is not enabled')
await renderPreviewPng(
  build.project,
  build.project.layout.aod,
  build.aodAssets,
  path.join(outputDirectory, 'aod.png'),
)

console.log(`Rendered RLC Singularity screenshots in ${outputDirectory}`)
