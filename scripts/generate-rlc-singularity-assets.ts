import { createRequire } from 'node:module'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const converterModule = require('nepali-date-converter') as {
  default: new (date: Date) => { format: (format: string, language?: 'np' | 'en') => string }
}
const NepaliDate = converterModule.default

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assetRoot = path.join(repositoryRoot, 'examples', 'rlc-singularity', 'assets')

const COLORS = {
  background: '#020405',
  copper: '#ff9a45',
  copperDim: '#3b2619',
  cyan: '#4cffe1',
  cyanDim: '#123d38',
  magenta: '#ff3eca',
  magentaDim: '#421434',
  violet: '#8765ff',
  mint: '#e4fff8',
  white: '#f7ffff',
  trace: '#243c38',
  muted: '#6c817b',
}

const FRAME_WIDTH = 176
const FRAME_HEIGHT = 196
const FRAME_COUNT = 48
const LOOP_PATH = 'M22 42 H29 L34 34 L42 50 L50 34 L58 50 L66 34 L71 42 H82 C82 27 94 27 94 42 C94 27 106 27 106 42 C106 27 118 27 118 42 C118 27 130 27 130 42 C130 27 142 27 142 42 H151 V76 M151 86 V150 H25 V42 H22'
const RESISTOR_PATH = 'M22 42 H29 L34 34 L42 50 L50 34 L58 50 L66 34 L71 42 H78'
const INDUCTOR_PATH = 'M82 42 C82 27 94 27 94 42 C94 27 106 27 106 42 C106 27 118 27 118 42 C118 27 130 27 130 42 C130 27 142 27 142 42'
const CAPACITOR_PATH = 'M139 76 H163 M139 86 H163'
const WIRE_PATH = 'M18 42 H22 M78 42 H82 M142 42 H151 V76 M151 86 V150 H25 V42 H18'

function document(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>\n`
}

async function writeSvg(relative: string, width: number, height: number, body: string): Promise<void> {
  const output = path.join(assetRoot, relative)
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, document(width, height, body))
}

async function writeIndexedPng(relative: string, width: number, height: number, body: string, colors = 192): Promise<void> {
  const output = path.join(assetRoot, relative)
  await mkdir(path.dirname(output), { recursive: true })
  await sharp(Buffer.from(document(width, height, body)))
    .flatten({ background: COLORS.background })
    .png({ compressionLevel: 9, palette: true, colours: colors, dither: 0.55 })
    .toFile(output)
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
  return `<g fill="${inactive}" opacity=".28">${all}</g><g fill="${color}">${lit}</g>`
}

async function generateDigitSet(directory: string, width: number, height: number, thickness: number, color: string, inactive: string): Promise<void> {
  await Promise.all(Object.entries(SEGMENTS).map(([name, active]) => writeSvg(
    `${directory}/${name}.svg`,
    width,
    height,
    traceDigit(width, height, thickness, color, inactive, active),
  )))
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function smoothstep(start: number, end: number, value: number): number {
  const normalized = clamp((value - start) / (end - start))
  return normalized * normalized * (3 - 2 * normalized)
}

function revealPath(pathData: string, color: string, progress: number, width = 2.2, opacity = 1): string {
  const dash = Math.round(clamp(progress) * 100)
  return `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="${dash} 100" opacity="${opacity.toFixed(3)}" filter="url(#glow-soft)"/>`
}

function componentParticles(centerX: number, centerY: number, progress: number, color: string, seed: number): string {
  const visibility = Math.sin(clamp(progress) * Math.PI)
  if (visibility < 0.02) return ''
  return Array.from({ length: 12 }, (_, index) => {
    const angle = (index * 137.5 + seed * 31) * Math.PI / 180
    const startRadius = 27 + (index % 4) * 5
    const radius = startRadius * (1 - progress)
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius * 0.55
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${index % 3 === 0 ? 1.5 : 0.8}" fill="${index % 4 === 0 ? COLORS.white : color}" opacity="${visibility.toFixed(3)}" filter="url(#glow-soft)"/>`
  }).join('')
}

function sineWave(frame: number, power: number): string {
  const points = Array.from({ length: 41 }, (_, index) => {
    const x = 46 + index * 2.1
    const envelope = Math.sin((index / 40) * Math.PI)
    const y = 105 + Math.sin(index * 0.67 - frame * 0.65) * 12 * envelope * power
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
  return `<polyline points="${points}" fill="none" stroke="${COLORS.cyan}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity="${power.toFixed(3)}" filter="url(#glow-soft)"/><polyline points="${points}" fill="none" stroke="${COLORS.white}" stroke-width=".45" opacity="${(power * 0.9).toFixed(3)}"/>`
}

function currentPulses(frame: number, power: number): string {
  if (power < 0.02) return ''
  const offset = -((frame * 10) % 100)
  return `<path d="${LOOP_PATH}" fill="none" stroke="${COLORS.white}" stroke-width="2" stroke-linecap="round" pathLength="100" stroke-dasharray="2.5 17" stroke-dashoffset="${offset}" opacity="${(power * 0.88).toFixed(3)}" filter="url(#glow-cyan)"/>`
}

function magneticField(power: number, frame: number): string {
  if (power < 0.02) return ''
  const phase = 0.65 + Math.sin(frame * 0.55) * 0.18
  return `<g fill="none" stroke="${COLORS.cyan}" stroke-width=".8" opacity="${(power * phase).toFixed(3)}"><path d="M87 19 Q112 4 137 19"/><path d="M91 24 Q112 12 133 24"/><path d="M87 59 Q112 74 137 59"/><path d="M91 54 Q112 66 133 54"/></g>`
}

function capacitorCharge(power: number, frame: number): string {
  if (power < 0.02) return ''
  const pulse = 0.65 + Math.sin(frame * 0.75) * 0.25
  return `<g opacity="${(power * pulse).toFixed(3)}" filter="url(#glow-soft)"><g fill="${COLORS.magenta}"><circle cx="143" cy="72" r="1.2"/><circle cx="151" cy="70" r="1.2"/><circle cx="159" cy="72" r="1.2"/></g><g fill="${COLORS.cyan}"><circle cx="143" cy="90" r="1.2"/><circle cx="151" cy="92" r="1.2"/><circle cx="159" cy="90" r="1.2"/></g><text x="168" y="77" fill="${COLORS.magenta}" font-family="ui-monospace,Menlo,monospace" font-size="7">+</text><text x="168" y="89" fill="${COLORS.cyan}" font-family="ui-monospace,Menlo,monospace" font-size="7">−</text></g>`
}

function shockWave(time: number, start: number, duration: number, color: string): string {
  const phase = clamp((time - start) / duration)
  if (phase <= 0 || phase >= 1) return ''
  const radius = 18 + phase * 54
  const opacity = Math.sin(phase * Math.PI) * 0.78
  return `<circle cx="88" cy="105" r="${radius.toFixed(2)}" fill="none" stroke="${color}" stroke-width="${(1.8 - phase).toFixed(2)}" opacity="${opacity.toFixed(3)}" filter="url(#glow-cyan)"/>`
}

function frameBody(frame: number): string {
  const time = frame / (FRAME_COUNT - 1)
  const shutdown = 1 - smoothstep(0.91, 1, time)
  const resistor = smoothstep(0.02, 0.24, time) * shutdown
  const inductor = smoothstep(0.18, 0.43, time) * shutdown
  const capacitor = smoothstep(0.36, 0.58, time) * shutdown
  const wires = smoothstep(0.48, 0.65, time) * shutdown
  const resonance = smoothstep(0.57, 0.70, time) * (1 - smoothstep(0.89, 1, time))
  const ignition = Math.exp(-Math.pow((time - 0.67) / 0.055, 2))
  const coreRadius = 7 + resonance * 9 + ignition * 8

  const definitions = `<defs><radialGradient id="core"><stop offset="0" stop-color="${COLORS.white}"/><stop offset=".24" stop-color="${COLORS.cyan}"/><stop offset=".58" stop-color="${COLORS.violet}"/><stop offset="1" stop-color="${COLORS.magenta}" stop-opacity="0"/></radialGradient><filter id="glow-cyan" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="glow-soft" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.25" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
  const background = `<rect width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}" fill="${COLORS.background}"/>`
  const hud = `<g fill="none" stroke="${COLORS.trace}" stroke-width=".75" opacity=".72"><path d="M5 17V7h10M161 7h10v10M5 165v10h10M161 175h10v-10"/><path d="M21 7h18M137 7h18M21 175h18M137 175h18" stroke-dasharray="2 3"/></g><g fill="${COLORS.muted}" font-family="ui-monospace,Menlo,monospace" font-size="4.5" opacity=".75"><text x="6" y="23">SERIES ARRAY</text><text x="170" y="23" text-anchor="end">R·L·C</text></g>`
  const blueprint = `<g fill="none" stroke="${COLORS.trace}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity=".62"><path d="${RESISTOR_PATH}"/><path d="${INDUCTOR_PATH}"/><path d="${CAPACITOR_PATH}"/><path d="${WIRE_PATH}"/></g>`
  const components = `${revealPath(RESISTOR_PATH, COLORS.copper, resistor, 2.5, shutdown)}${revealPath(INDUCTOR_PATH, COLORS.cyan, inductor, 2.5, shutdown)}${revealPath(CAPACITOR_PATH, COLORS.magenta, capacitor, 2.8, shutdown)}${revealPath(WIRE_PATH, COLORS.violet, wires, 1.9, shutdown)}`
  const particles = `${componentParticles(49, 42, resistor, COLORS.copper, 1)}${componentParticles(112, 42, inductor, COLORS.cyan, 2)}${componentParticles(151, 81, capacitor, COLORS.magenta, 3)}`
  const labels = `<g font-family="ui-monospace,Menlo,monospace" font-size="7" font-weight="700" text-anchor="middle"><text x="50" y="61" fill="${COLORS.copper}" opacity="${resistor.toFixed(3)}">R</text><text x="112" y="17" fill="${COLORS.cyan}" opacity="${inductor.toFixed(3)}">L</text><text x="132" y="84" fill="${COLORS.magenta}" opacity="${capacitor.toFixed(3)}">C</text></g>`
  const core = `<circle cx="88" cy="105" r="${(coreRadius + 10).toFixed(2)}" fill="url(#core)" opacity="${(resonance * 0.24 + ignition * 0.5).toFixed(3)}" filter="url(#glow-cyan)"/><circle cx="88" cy="105" r="${coreRadius.toFixed(2)}" fill="url(#core)" opacity="${(0.15 + resonance * 0.85).toFixed(3)}" filter="url(#glow-cyan)"/><circle cx="88" cy="105" r="${(24 + resonance * 8).toFixed(2)}" fill="none" stroke="${COLORS.magenta}" stroke-width=".8" stroke-dasharray="7 5 1 5" stroke-dashoffset="${-frame * 2}" opacity="${(resonance * 0.8).toFixed(3)}"/><circle cx="88" cy="105" r="${(31 + resonance * 7).toFixed(2)}" fill="none" stroke="${COLORS.cyan}" stroke-width=".7" stroke-dasharray="13 7 2 7" stroke-dashoffset="${frame * 2.6}" opacity="${(resonance * 0.65).toFixed(3)}"/>`

  return `${definitions}${background}${hud}${blueprint}${components}${particles}${magneticField(inductor * shutdown, frame)}${capacitorCharge(capacitor * shutdown, frame)}${currentPulses(frame, resonance)}${shockWave(time, 0.63, 0.17, COLORS.cyan)}${shockWave(time, 0.68, 0.2, COLORS.magenta)}${core}${sineWave(frame, resonance)}${labels}`
}

function aodBody(): string {
  return `<rect width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}" fill="#000000"/><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${WIRE_PATH}" stroke="#21453f" stroke-width="1.4"/><path d="${RESISTOR_PATH}" stroke="#6c4930" stroke-width="1.8"/><path d="${INDUCTOR_PATH}" stroke="#397c70" stroke-width="1.8"/><path d="${CAPACITOR_PATH}" stroke="#71315f" stroke-width="2"/><circle cx="88" cy="105" r="25" stroke="#397c70" stroke-width=".8" stroke-dasharray="9 7"/><circle cx="88" cy="105" r="8" fill="#0d2925" stroke="#4b9487" stroke-width="1"/></g><g fill="#397c70" font-family="ui-monospace,Menlo,monospace" text-anchor="middle"><text x="50" y="61" font-size="7">R</text><text x="112" y="17" font-size="7">L</text><text x="132" y="84" font-size="7">C</text></g>`
}

function label(text: string, color = COLORS.muted, width = 150): string {
  return `<text x="${width / 2}" y="8" fill="${color}" font-family="ui-monospace,Menlo,monospace" font-size="8" font-weight="700" letter-spacing="1.2" text-anchor="middle">${text}</text>`
}

async function generateAnimation(): Promise<void> {
  const animationDirectory = path.join(assetRoot, 'anim')
  await mkdir(animationDirectory, { recursive: true })
  const existingFrames = await readdir(animationDirectory)
  await Promise.all(existingFrames.filter((name) => /^rlc-\d+\.(?:png|svg)$/.test(name)).map((name) => rm(path.join(animationDirectory, name))))
  await Promise.all(Array.from({ length: FRAME_COUNT }, (_, index) => writeIndexedPng(
    `anim/rlc-${String(index).padStart(2, '0')}.png`,
    FRAME_WIDTH,
    FRAME_HEIGHT,
    frameBody(index),
  )))
}

function currentMonthAnchor(): { year: number; month: number } {
  const override = process.env.RLC_AD_MONTH
  if (override) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(override)
    if (!match) throw new Error('RLC_AD_MONTH must use YYYY-MM, for example 2026-07')
    return { year: Number(match[1]), month: Number(match[2]) - 1 }
  }
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

async function generateNepaliDates(): Promise<void> {
  const { year, month } = currentMonthAnchor()
  const monthCode = `${year}-${String(month + 1).padStart(2, '0')}`
  await Promise.all(Array.from({ length: 31 }, (_, index) => {
    const day = index + 1
    const adDate = new Date(Date.UTC(year, month, day, 12))
    const nepali = new NepaliDate(adDate).format('MM/DD', 'np')
    const body = `<rect width="118" height="30" fill="${COLORS.background}"/><text x="59" y="23" fill="${COLORS.cyan}" font-family="Devanagari Sangam MN,Noto Sans Devanagari,sans-serif" font-size="21" font-weight="600" text-anchor="middle">${nepali}</text>`
    return writeIndexedPng(`bs-date/day-${String(day).padStart(2, '0')}.png`, 118, 30, body, 64)
  }))
  const today = new Date()
  if (today.getFullYear() === year && today.getMonth() === month) {
    const currentBs = new NepaliDate(new Date(Date.UTC(year, month, today.getDate(), 12))).format('YYYY/MM/DD')
    console.log(`Nepali lookup ${monthCode}: today maps to ${currentBs} BS`)
  } else {
    console.log(`Nepali lookup generated for ${monthCode}`)
  }
}

async function generateDecor(): Promise<void> {
  await Promise.all([
    writeSvg('labels/steps.svg', 72, 10, label('STEP CURRENT', COLORS.cyan, 72)),
    writeSvg('labels/battery.svg', 70, 10, label('CELL CHARGE', COLORS.magenta, 70)),
    writeSvg('decor/colon.svg', 8, 58, `<g fill="${COLORS.muted}"><circle cx="4" cy="19" r="2.4"/><circle cx="4" cy="39" r="2.4"/></g>`),
    writeSvg('decor/colon-aod.svg', 8, 58, '<g fill="#2f6e64"><circle cx="4" cy="19" r="2.1"/><circle cx="4" cy="39" r="2.1"/></g>'),
    writeSvg('decor/date-dot.svg', 8, 28, `<path d="M6 3 2 25" stroke="${COLORS.muted}" stroke-width="1.6" stroke-linecap="round"/>`),
    writeSvg('decor/percent.svg', 8, 20, `<text x="0" y="15" fill="${COLORS.magenta}" font-family="ui-monospace,Menlo,monospace" font-size="11" font-weight="700">%</text>`),
    writeSvg('decor/rlc-aod.svg', FRAME_WIDTH, FRAME_HEIGHT, aodBody()),
  ])
}

await Promise.all([
  generateDigitSet('digits-hour', 28, 58, 4, COLORS.copper, COLORS.copperDim),
  generateDigitSet('digits-minute', 28, 58, 4, COLORS.cyan, COLORS.cyanDim),
  generateDigitSet('digits-data', 10, 20, 2, COLORS.mint, COLORS.trace),
  generateDigitSet('digits-date', 14, 28, 2, COLORS.mint, COLORS.trace),
  generateDigitSet('digits-aod', 28, 58, 4, '#397c70', '#102d29'),
  generateAnimation(),
  generateNepaliDates(),
  generateDecor(),
])

console.log(`Generated RLC Singularity assets in ${assetRoot}`)
