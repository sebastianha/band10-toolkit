import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProject, renderPreviewPng } from '../builder/index.ts'
import { DEFAULT_SIMULATION } from '../core/index.ts'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const projectDirectory = path.join(repositoryRoot, 'examples', 'odyssey')
const outputDirectory = path.join(projectDirectory, 'screenshots')
const build = await buildProject(projectDirectory)

await mkdir(outputDirectory, { recursive: true })

const anim = build.project.layout.normal.widgets.find((widget) => widget.id === 'odyssey')
if (!anim || anim.type !== 'animation') throw new Error('Odyssey animation widget is missing')
const frameCount = anim.frames.length
const intervalMs = anim.intervalMs
const targetFrame = Math.floor(frameCount / 2)
const baseTimestamp = new Date(DEFAULT_SIMULATION.dateTime).getTime()
const baseFrame = Math.abs(Math.floor(baseTimestamp / intervalMs)) % frameCount
const advance = (targetFrame - baseFrame + frameCount) % frameCount

await renderPreviewPng(
  build.project,
  build.project.layout.normal,
  build.normalAssets,
  path.join(outputDirectory, 'active.png'),
  { ...DEFAULT_SIMULATION, dateTime: new Date(baseTimestamp + advance * intervalMs).toISOString() },
)

if (build.project.layout.aod?.enabled) {
  await renderPreviewPng(build.project, build.project.layout.aod, build.aodAssets, path.join(outputDirectory, 'aod.png'))
}

console.log(`Rendered Odyssey screenshots in ${outputDirectory}`)
