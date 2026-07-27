import { execFile } from 'node:child_process'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import sharp from 'sharp'

const run = promisify(execFile)

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exampleRoot = path.join(repositoryRoot, 'examples', 'video-portrait')
const assetRoot = path.join(exampleRoot, 'assets')

// Source video and trim window. Override with VIDEO_SRC / VIDEO_START / VIDEO_END.
const VIDEO_SRC = process.env.VIDEO_SRC ?? '/Users/mac/Downloads/BraveDownloads/ts1ekty5rsrmy0czkrrsx01tfr.webm'
const VIDEO_START = process.env.VIDEO_START ?? '0.0'
const VIDEO_END = process.env.VIDEO_END ?? '4.0'
const FPS = Number(process.env.VIDEO_FPS ?? '30')
// Palette colours per frame. Lower = smaller package, slightly lower quality.
const COLOURS = Number(process.env.VIDEO_COLOURS ?? '256')

const CANVAS_WIDTH = 212
const CANVAS_HEIGHT = 520

const COLORS = {
  background: '#000000',
  white: '#f7ffff',
  cyan: '#4cffe1',
  copper: '#ff9a45',
  magenta: '#ff3eca',
  mint: '#e4fff8',
  trace: '#243c38',
  muted: '#8fa39d',
}

function document(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>\n`
}

async function writeSvg(relative: string, width: number, height: number, body: string): Promise<void> {
  const output = path.join(assetRoot, relative)
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, document(width, height, body))
}

const SEGMENTS: Record<string, string[]> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'g', 'e', 'd'],
  '3': ['a', 'b', 'g', 'c', 'd'],
  '4': ['f', 'g', 'b', 'c'],
  '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'g', 'e', 'c', 'd'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
  minus: ['g'],
}

function traceDigit(width: number, height: number, thickness: number, color: string, inactive: string, active: string[]): string {
  const middle = Math.round((height - thickness) / 2)
  const verticalHeight = middle - thickness
  const segments: Record<string, string> = {
    a: `<rect x="${thickness}" y="0" width="${width - thickness * 2}" height="${thickness}" rx="${thickness / 2}"/>`,
    b: `<rect x="${width - thickness}" y="${thickness}" width="${thickness}" height="${verticalHeight}" rx="${thickness / 2}"/>`,
    c: `<rect x="${width - thickness}" y="${middle + thickness}" width="${thickness}" height="${verticalHeight}" rx="${thickness / 2}"/>`,
    d: `<rect x="${thickness}" y="${height - thickness}" width="${width - thickness * 2}" height="${thickness}" rx="${thickness / 2}"/>`,
    e: `<rect x="0" y="${middle + thickness}" width="${thickness}" height="${verticalHeight}" rx="${thickness / 2}"/>`,
    f: `<rect x="0" y="${thickness}" width="${thickness}" height="${verticalHeight}" rx="${thickness / 2}"/>`,
    g: `<rect x="${thickness}" y="${middle}" width="${width - thickness * 2}" height="${thickness}" rx="${thickness / 2}"/>`,
  }
  const all = Object.values(segments).join('')
  const lit = active.map((segment) => segments[segment]).join('')
  return `<g fill="${inactive}" opacity=".22">${all}</g><g fill="${color}">${lit}</g>`
}

async function generateDigitSet(directory: string, width: number, height: number, thickness: number, color: string, inactive: string): Promise<void> {
  await Promise.all(Object.entries(SEGMENTS).map(([name, active]) => writeSvg(
    `${directory}/${name}.svg`,
    width,
    height,
    traceDigit(width, height, thickness, color, inactive, active),
  )))
}

async function extractFrames(): Promise<string[]> {
  const animationDirectory = path.join(assetRoot, 'anim')
  await mkdir(animationDirectory, { recursive: true })
  const existing = await readdir(animationDirectory)
  await Promise.all(existing.filter((name) => /^bg-\d+\.png$/.test(name)).map((name) => rm(path.join(animationDirectory, name))))

  // Scale to cover the canvas height, centre-crop the width, and flatten onto black (opaque, no alpha).
  const filter = `fps=${FPS},scale=-2:${CANVAS_HEIGHT},crop=${CANVAS_WIDTH}:${CANVAS_HEIGHT},format=rgb24`
  await run('ffmpeg', [
    '-y', '-v', 'error',
    '-ss', VIDEO_START,
    '-to', VIDEO_END,
    '-i', VIDEO_SRC,
    '-vf', filter,
    '-frames:v', '240',
    path.join(animationDirectory, 'raw-%03d.png'),
  ])

  const raw = (await readdir(animationDirectory)).filter((name) => /^raw-\d+\.png$/.test(name)).sort()
  if (raw.length < 2) throw new Error(`Expected at least 2 extracted frames, found ${raw.length}. Check VIDEO_SRC/trim window.`)

  const frames: string[] = []
  for (const [index, name] of raw.entries()) {
    const target = `bg-${String(index).padStart(2, '0')}.png`
    // Flatten onto black, then quantize to an indexed palette. The native packer
    // stores indexed frames at ~1 byte/pixel + RLE, so full-screen 30fps fits.
    await sharp(path.join(animationDirectory, name))
      .flatten({ background: COLORS.background })
      .png({ compressionLevel: 9, palette: true, colours: COLOURS, dither: 1 })
      .toFile(path.join(animationDirectory, target))
    await rm(path.join(animationDirectory, name))
    frames.push(`assets/anim/${target}`)
  }
  console.log(`Extracted ${frames.length} background frames at ${FPS} fps (${COLOURS}-colour) from ${path.basename(VIDEO_SRC)}`)
  return frames
}

async function generateDecor(): Promise<void> {
  await Promise.all([
    writeSvg('decor/colon.svg', 8, 52, `<g fill="${COLORS.white}"><circle cx="4" cy="17" r="2.6"/><circle cx="4" cy="35" r="2.6"/></g>`),
    writeSvg('decor/colon-aod.svg', 8, 52, '<g fill="#2f6e64"><circle cx="4" cy="17" r="2.2"/><circle cx="4" cy="35" r="2.2"/></g>'),
    writeSvg('decor/date-slash.svg', 8, 28, `<path d="M6 3 2 25" stroke="${COLORS.muted}" stroke-width="1.6" stroke-linecap="round"/>`),
    writeSvg('decor/percent.svg', 9, 20, `<text x="0" y="15" fill="${COLORS.cyan}" font-family="ui-monospace,Menlo,monospace" font-size="11" font-weight="700">%</text>`),
    // Soft dark scrim so the clock stays legible over bright video frames.
    writeSvg('decor/scrim.svg', CANVAS_WIDTH, 210, `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity=".72"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></linearGradient></defs><rect width="${CANVAS_WIDTH}" height="210" fill="url(#s)"/>`),
  ])
}

function buildLayout(frames: string[]): unknown {
  const intervalMs = Math.round(1000 / FPS)
  return {
    $schema: '../../schemas/layout.schema.json',
    formatVersion: 1,
    canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, clip: 'pill' },
    assets: {
      digitSets: {
        time: {
          digits: Array.from({ length: 10 }, (_, index) => `assets/digits-time/${index}.svg`),
          minus: 'assets/digits-time/minus.svg',
        },
        'time-cyan': {
          digits: Array.from({ length: 10 }, (_, index) => `assets/digits-cyan/${index}.svg`),
          minus: 'assets/digits-cyan/minus.svg',
        },
        data: {
          digits: Array.from({ length: 10 }, (_, index) => `assets/digits-data/${index}.svg`),
          minus: 'assets/digits-data/minus.svg',
        },
        aod: {
          digits: Array.from({ length: 10 }, (_, index) => `assets/digits-aod/${index}.svg`),
          minus: 'assets/digits-aod/minus.svg',
        },
      },
    },
    normal: {
      background: '#000000',
      widgets: [
        {
          id: 'portrait',
          label: 'Portrait video background',
          type: 'animation',
          frames,
          intervalMs,
          repeat: 0,
          x: 0,
          y: 0,
          z: 0,
          locked: true,
        },
        { id: 'scrim', label: 'Legibility scrim', type: 'image', asset: 'assets/decor/scrim.svg', x: 0, y: 0, z: 1, allowOverlap: true, locked: true },
        { id: 'hours', label: 'Hours', type: 'number', source: 'hour', digitSet: 'time', digits: 2, align: 'left', spacing: 4, leadingZero: true, x: 40, y: 40, z: 2, allowOverlap: true },
        { id: 'time-colon', label: 'Clock separator', type: 'image', asset: 'assets/decor/colon.svg', x: 102, y: 40, z: 2, allowOverlap: true, locked: true },
        { id: 'minutes', label: 'Minutes', type: 'number', source: 'minute', digitSet: 'time-cyan', digits: 2, align: 'left', spacing: 4, leadingZero: true, x: 114, y: 40, z: 2, allowOverlap: true },
        { id: 'month', label: 'Month', type: 'number', source: 'month', digitSet: 'data', digits: 2, align: 'left', spacing: 2, leadingZero: true, x: 71, y: 110, z: 2, allowOverlap: true },
        { id: 'date-slash', label: 'Date separator', type: 'image', asset: 'assets/decor/date-slash.svg', x: 103, y: 110, z: 2, allowOverlap: true, locked: true },
        { id: 'day', label: 'Day', type: 'number', source: 'day', digitSet: 'data', digits: 2, align: 'left', spacing: 2, leadingZero: true, x: 114, y: 110, z: 2, allowOverlap: true },
        { id: 'battery', label: 'Battery percentage', type: 'number', source: 'battery', digitSet: 'data', digits: 3, align: 'center', spacing: 2, leadingZero: false, unitAsset: 'assets/decor/percent.svg', x: 106, y: 150, z: 2, allowOverlap: true },
      ],
    },
    aod: {
      enabled: true,
      background: '#000000',
      widgets: [
        { id: 'aod-hours', label: 'AOD hours', type: 'number', source: 'hour', digitSet: 'aod', digits: 2, align: 'left', spacing: 4, leadingZero: true, x: 40, y: 150, z: 1 },
        { id: 'aod-colon', label: 'AOD separator', type: 'image', asset: 'assets/decor/colon-aod.svg', x: 102, y: 150, z: 1, locked: true },
        { id: 'aod-minutes', label: 'AOD minutes', type: 'number', source: 'minute', digitSet: 'aod', digits: 2, align: 'left', spacing: 4, leadingZero: true, x: 114, y: 150, z: 1 },
      ],
    },
  }
}

const frames = await extractFrames()
await Promise.all([
  generateDigitSet('digits-time', 28, 52, 4, COLORS.white, COLORS.trace),
  generateDigitSet('digits-cyan', 28, 52, 4, COLORS.cyan, COLORS.trace),
  generateDigitSet('digits-data', 14, 28, 2, COLORS.mint, COLORS.trace),
  generateDigitSet('digits-aod', 28, 58, 4, '#397c70', '#102d29'),
  generateDecor(),
])
await writeFile(path.join(exampleRoot, 'layout.json'), `${JSON.stringify(buildLayout(frames), null, 2)}\n`)

console.log(`Generated Portrait Loop assets in ${assetRoot}`)
