import { execFile } from 'node:child_process'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import sharp from 'sharp'

const run = promisify(execFile)

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exampleRoot = path.join(repositoryRoot, 'examples', 'odyssey')
const assetRoot = path.join(exampleRoot, 'assets')

// Video-only face. Override any of these with env vars.
const VIDEO_SRC = process.env.VIDEO_SRC ?? '/Users/mac/Downloads/BraveDownloads/The Odyssey  Official New Trailer - Universal Pictures (360p, h264).mp4'
const VIDEO_START = process.env.VIDEO_START ?? '85'
const VIDEO_END = process.env.VIDEO_END ?? '95'
const FPS = Number(process.env.VIDEO_FPS ?? '15')
const COLOURS = Number(process.env.VIDEO_COLOURS ?? '128')
// Rotate 90° so a landscape clip fills the tall screen (view by turning the watch
// sideways). '1' = clockwise, '2' = counter-clockwise, '0' = no rotation (letterbox).
const ROTATE = process.env.VIDEO_ROTATE ?? '1'

const CANVAS_WIDTH = 212
const CANVAS_HEIGHT = 520
const BG = '#000000'

async function extractFrames(): Promise<{ frames: string[]; frameHeight: number }> {
  const animationDirectory = path.join(assetRoot, 'anim')
  await mkdir(animationDirectory, { recursive: true })
  const existing = await readdir(animationDirectory).catch(() => [])
  await Promise.all(existing.filter((name) => /^(raw|ody)-\d+\.png$/.test(name)).map((name) => rm(path.join(animationDirectory, name))))

  // Landscape: rotate 90° then cover-crop to fill the full 212×520 screen.
  // Letterbox (ROTATE=0): fit to full width, black bars top/bottom.
  const transpose = ROTATE === '1' || ROTATE === '2' ? `transpose=${ROTATE},` : ''
  const scaleCrop = transpose
    ? `scale=-2:${CANVAS_HEIGHT},crop=${CANVAS_WIDTH}:${CANVAS_HEIGHT}`
    : `scale=${CANVAS_WIDTH}:-2`
  const filter = `${transpose}fps=${FPS},${scaleCrop},format=rgb24`
  await run('ffmpeg', [
    '-y', '-v', 'error',
    '-ss', VIDEO_START,
    '-to', VIDEO_END,
    '-i', VIDEO_SRC,
    '-vf', filter,
    '-frames:v', '300',
    path.join(animationDirectory, 'raw-%03d.png'),
  ])

  const raw = (await readdir(animationDirectory)).filter((name) => /^raw-\d+\.png$/.test(name)).sort()
  if (raw.length < 2) throw new Error(`Expected at least 2 extracted frames, found ${raw.length}. Check VIDEO_SRC/trim window.`)

  let frameHeight = 0
  const frames: string[] = []
  for (const [index, name] of raw.entries()) {
    const target = `ody-${String(index).padStart(3, '0')}.png`
    const pipeline = sharp(path.join(animationDirectory, name)).flatten({ background: BG }).png({ compressionLevel: 9, palette: true, colours: COLOURS, dither: 1 })
    const { info } = await pipeline.toBuffer({ resolveWithObject: true })
    frameHeight = info.height
    await sharp(path.join(animationDirectory, name)).flatten({ background: BG }).png({ compressionLevel: 9, palette: true, colours: COLOURS, dither: 1 }).toFile(path.join(animationDirectory, target))
    await rm(path.join(animationDirectory, name))
    frames.push(`assets/anim/${target}`)
  }
  console.log(`Extracted ${frames.length} frames at ${FPS} fps (${COLOURS}-colour, ${CANVAS_WIDTH}x${frameHeight}) from ${path.basename(VIDEO_SRC)}`)
  return { frames, frameHeight }
}

const { frames, frameHeight } = await extractFrames()
const videoY = Math.round((CANVAS_HEIGHT - frameHeight) / 2)

// A single dim static frame for AOD (video must not animate in always-on mode).
const aodFrame = frames[Math.floor(frames.length / 2)] ?? frames[0]

const layout = {
  $schema: '../../schemas/layout.schema.json',
  formatVersion: 1,
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, clip: 'pill' },
  assets: { digitSets: {} },
  normal: {
    background: BG,
    widgets: [
      {
        id: 'odyssey',
        label: 'Odyssey trailer loop',
        type: 'animation',
        frames,
        intervalMs: Math.round(1000 / FPS),
        repeat: 0,
        x: 0,
        y: videoY,
        z: 0,
        locked: true,
      },
    ],
  },
  aod: {
    enabled: true,
    background: '#000000',
    widgets: [
      { id: 'aod-still', label: 'AOD still frame', type: 'image', asset: aodFrame, opacity: 0.4, x: 0, y: videoY, z: 0, locked: true },
    ],
  },
}

await writeFile(path.join(exampleRoot, 'layout.json'), `${JSON.stringify(layout, null, 2)}\n`)
console.log(`Generated Odyssey assets in ${assetRoot}`)
