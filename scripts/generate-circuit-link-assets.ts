import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assetRoot = path.join(repositoryRoot, 'examples', 'circuit-link', 'assets')

const COLORS = {
  copper: '#ff9b4a',
  copperDim: '#3a2a1e',
  cyan: '#59ffe3',
  cyanDim: '#173f3a',
  magenta: '#ff3bd4',
  violet: '#8b5cff',
  mint: '#dffff6',
  white: '#f4ffff',
  trace: '#26403a',
  muted: '#6d857d',
}

function document(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>\n`
}

async function write(relative: string, width: number, height: number, body: string): Promise<void> {
  const output = path.join(assetRoot, relative)
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, document(width, height, body))
}

async function writeIndexedFrame(relative: string, body: string): Promise<void> {
  const output = path.join(assetRoot, relative)
  await mkdir(path.dirname(output), { recursive: true })
  await sharp(Buffer.from(document(FRAME_WIDTH, FRAME_HEIGHT, body)))
    .flatten({ background: '#020605' })
    .png({ compressionLevel: 9, palette: true, colours: 192, dither: 0.55 })
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
  return `<g fill="${inactive}" opacity=".26">${all}</g><g fill="${color}">${lit}</g>`
}

async function generateDigitSet(directory: string, width: number, height: number, thickness: number, color: string, inactive: string): Promise<void> {
  await Promise.all(Object.entries(SEGMENTS).map(([name, active]) => write(
    `${directory}/${name}.svg`,
    width,
    height,
    traceDigit(width, height, thickness, color, inactive, active),
  )))
}

// --- The animation: a non-human circuit assembles, locks, ignites, and collapses. ---
// Every SVG is rasterized by the builder, so the watch only flips compact image frames.
const FRAME_WIDTH = 176
const FRAME_HEIGHT = 196
const FRAME_COUNT = 48
const CX = 88
const CY = 91

const CIRCUIT_PATHS = [
  { d: 'M4 91 H27 L40 78 H58 L70 90', padX: 4, padY: 91, color: COLORS.cyan },
  { d: 'M172 91 H149 L136 104 H118 L106 92', padX: 172, padY: 91, color: COLORS.magenta },
  { d: 'M88 5 V27 L76 39 V58 L87 70', padX: 88, padY: 5, color: COLORS.copper },
  { d: 'M88 177 V155 L100 143 V124 L89 112', padX: 88, padY: 177, color: COLORS.violet },
  { d: 'M12 31 H29 L45 47 H58 L73 72', padX: 12, padY: 31, color: COLORS.violet },
  { d: 'M164 31 H147 L131 47 H118 L103 72', padX: 164, padY: 31, color: COLORS.cyan },
  { d: 'M12 151 H29 L45 135 H58 L73 110', padX: 12, padY: 151, color: COLORS.copper },
  { d: 'M164 151 H147 L131 135 H118 L103 110', padX: 164, padY: 151, color: COLORS.magenta },
] as const

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function smoothstep(start: number, end: number, value: number): number {
  const normalized = clamp((value - start) / (end - start))
  return normalized * normalized * (3 - 2 * normalized)
}

function polar(radius: number, angleDegrees: number): { x: number; y: number } {
  const angle = (angleDegrees * Math.PI) / 180
  return { x: CX + Math.cos(angle) * radius, y: CY + Math.sin(angle) * radius }
}

function polygonPoints(radius: number, sides: number, rotation: number): string {
  return Array.from({ length: sides }, (_, index) => {
    const point = polar(radius, rotation + (index * 360) / sides)
    return `${point.x.toFixed(2)},${point.y.toFixed(2)}`
  }).join(' ')
}

function shockWave(time: number, start: number, duration: number, color: string): string {
  const phase = clamp((time - start) / duration)
  if (phase <= 0 || phase >= 1) return ''
  const opacity = Math.sin(phase * Math.PI) * 0.9
  const radius = 17 + phase * 66
  return `<circle cx="${CX}" cy="${CY}" r="${radius.toFixed(2)}" fill="none" stroke="${color}" stroke-width="${(2.4 - phase * 1.8).toFixed(2)}" opacity="${opacity.toFixed(3)}" filter="url(#glow-cyan)"/>`
}

function circuitLayer(assembly: number, power: number, shutdown: number, frame: number): string {
  return CIRCUIT_PATHS.map((pathDefinition, index) => {
    const delay = index * 0.055
    const progress = clamp((assembly - delay) / (1 - delay))
    const dash = Math.round(progress * 100)
    const liveOpacity = (0.3 + progress * 0.7) * shutdown
    const pulseOffset = -((frame * 11 + index * 17) % 100)
    const pulse = power > 0.02
      ? `<path d="${pathDefinition.d}" fill="none" stroke="${COLORS.white}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="3 97" stroke-dashoffset="${pulseOffset}" opacity="${(power * 0.95).toFixed(3)}" filter="url(#glow-cyan)"/>`
      : ''
    return `<g><path d="${pathDefinition.d}" fill="none" stroke="${COLORS.trace}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".62"/><path d="${pathDefinition.d}" fill="none" stroke="${pathDefinition.color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="${dash} 100" opacity="${liveOpacity.toFixed(3)}" filter="url(#glow-soft)"/>${pulse}<circle cx="${pathDefinition.padX}" cy="${pathDefinition.padY}" r="3.2" fill="#020807" stroke="${pathDefinition.color}" stroke-width="1.2" opacity="${(0.35 + progress * 0.65).toFixed(3)}"/><circle cx="${pathDefinition.padX}" cy="${pathDefinition.padY}" r=".9" fill="${COLORS.white}" opacity="${(progress * shutdown).toFixed(3)}"/></g>`
  }).join('')
}

function convergingParticles(time: number, frame: number): string {
  const gate = smoothstep(0.27, 0.34, time) * (1 - smoothstep(0.52, 0.57, time))
  if (gate <= 0.01) return ''
  const travel = smoothstep(0.27, 0.55, time)
  return Array.from({ length: 8 }, (_, index) => {
    const angle = index * 45 + (index % 2 === 0 ? 0 : 6)
    const radius = 78 - travel * 58 + Math.sin(frame * 0.7 + index) * 2
    const head = polar(radius, angle)
    const tail = polar(radius + 7, angle)
    const color = index % 3 === 0 ? COLORS.magenta : index % 3 === 1 ? COLORS.cyan : COLORS.copper
    return `<line x1="${tail.x.toFixed(2)}" y1="${tail.y.toFixed(2)}" x2="${head.x.toFixed(2)}" y2="${head.y.toFixed(2)}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" opacity="${gate.toFixed(3)}"/><circle cx="${head.x.toFixed(2)}" cy="${head.y.toFixed(2)}" r="2" fill="${COLORS.white}" opacity="${gate.toFixed(3)}" filter="url(#glow-cyan)"/>`
  }).join('')
}

function orbitingParticles(power: number, frame: number): string {
  if (power <= 0.01) return ''
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? 43 : 57
    const direction = index % 2 === 0 ? 1 : -1
    const angle = index * 36 + frame * (5 + (index % 3)) * direction
    const point = polar(radius, angle)
    const color = index % 2 === 0 ? COLORS.cyan : COLORS.magenta
    const size = index % 3 === 0 ? 1.8 : 1.1
    return `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${size}" fill="${color}" opacity="${(0.35 + power * 0.65).toFixed(3)}" filter="url(#glow-soft)"/>`
  }).join('')
}

function ringGlyphs(rotation: number, opacity: number): string {
  const glyphs = Array.from({ length: 12 }, (_, index) => {
    const angle = rotation + index * 30
    const point = polar(68, angle)
    const color = index % 3 === 0 ? COLORS.magenta : index % 3 === 1 ? COLORS.cyan : COLORS.copper
    const glyph = index % 2 === 0
      ? '<path d="M0 -3 2.5 2.5-2.5 2.5Z" fill="none" stroke="currentColor" stroke-width=".8"/>'
      : '<path d="M-2.5 0h5M0-2.5v5" fill="none" stroke="currentColor" stroke-width=".8"/>'
    return `<g transform="translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${(angle + 90).toFixed(2)})" color="${color}">${glyph}</g>`
  }).join('')
  return `<g opacity="${opacity.toFixed(3)}">${glyphs}</g>`
}

function ignitionRays(burst: number, frame: number): string {
  if (burst <= 0.02) return ''
  return Array.from({ length: 16 }, (_, index) => {
    const angle = index * 22.5 + frame * 1.5
    const inner = polar(20 + (index % 2) * 4, angle)
    const outer = polar(28 + burst * (24 + (index % 4) * 5), angle)
    const color = index % 2 === 0 ? COLORS.cyan : COLORS.magenta
    return `<line x1="${inner.x.toFixed(2)}" y1="${inner.y.toFixed(2)}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}" stroke="${color}" stroke-width="${index % 3 === 0 ? 1.4 : 0.8}" stroke-linecap="round" opacity="${(burst * 0.9).toFixed(3)}"/>`
  }).join('')
}

function animationFrame(frame: number): string {
  const time = frame / (FRAME_COUNT - 1)
  const assembly = smoothstep(0.02, 0.38, time)
  const charged = smoothstep(0.31, 0.53, time)
  const shutdown = 1 - smoothstep(0.88, 1, time)
  const stablePower = smoothstep(0.52, 0.64, time) * shutdown
  const ringPower = smoothstep(0.29, 0.48, time) * shutdown
  const burst = Math.exp(-Math.pow((time - 0.56) / 0.055, 2))
  const corePower = 0.12 + charged * shutdown * 0.88
  const coreRadius = 5 + corePower * 11 + burst * 12
  const rotation = frame * 8.5
  const counterRotation = -frame * 13
  const flicker = time > 0.9 ? (frame % 2 === 0 ? 0.42 : 1) : 1
  const activeOpacity = ringPower * flicker
  const status = time < 0.31 ? 'SIGNAL // DETECTED' : time < 0.53 ? 'VOID-LINK // ARMING' : time < 0.88 ? 'ANOMALY // STABLE' : 'LINK // COLLAPSING'

  const definitions = `<defs><radialGradient id="core-gradient"><stop offset="0" stop-color="${COLORS.white}"/><stop offset=".2" stop-color="${COLORS.cyan}"/><stop offset=".55" stop-color="${COLORS.violet}"/><stop offset="1" stop-color="${COLORS.magenta}" stop-opacity="0"/></radialGradient><filter id="glow-cyan" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="glow-soft" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
  const frameHud = `<g fill="none" stroke="${COLORS.trace}" stroke-width=".8" opacity=".68"><path d="M5 17V7h10M161 7h10v10M5 165v10h10M161 175h10v-10"/><path d="M21 7h18M137 7h18M21 175h18M137 175h18" stroke-dasharray="2 3"/></g><g fill="${COLORS.muted}" font-family="ui-monospace,Menlo,monospace" font-size="4.5" opacity=".7"><text x="6" y="23">XENO BUS 07</text><text x="170" y="23" text-anchor="end">O66</text></g>`
  const circuits = circuitLayer(assembly, stablePower, shutdown, frame)
  const rings = `<g fill="none" transform="rotate(${rotation.toFixed(2)} ${CX} ${CY})" opacity="${activeOpacity.toFixed(3)}"><circle cx="${CX}" cy="${CY}" r="61" stroke="${COLORS.cyan}" stroke-width=".9" stroke-dasharray="13 8 2 8"/><circle cx="${CX}" cy="${CY}" r="55" stroke="${COLORS.violet}" stroke-width=".7" stroke-dasharray="1 5"/></g><g fill="none" transform="rotate(${counterRotation.toFixed(2)} ${CX} ${CY})" opacity="${activeOpacity.toFixed(3)}"><circle cx="${CX}" cy="${CY}" r="46" stroke="${COLORS.magenta}" stroke-width="1.2" stroke-dasharray="20 11 4 8"/><circle cx="${CX}" cy="${CY}" r="38" stroke="${COLORS.copper}" stroke-width=".8" stroke-dasharray="3 6"/></g>${ringGlyphs(rotation * 0.55, activeOpacity)}`
  const core = `<circle cx="${CX}" cy="${CY}" r="${(coreRadius + 9).toFixed(2)}" fill="url(#core-gradient)" opacity="${(0.13 + corePower * 0.25 + burst * 0.45).toFixed(3)}" filter="url(#glow-cyan)"/><polygon points="${polygonPoints(28 + burst * 5, 6, rotation * 0.32)}" fill="#020807" fill-opacity=".72" stroke="${COLORS.cyan}" stroke-width="1.1" opacity="${(0.2 + ringPower * 0.8).toFixed(3)}"/><polygon points="${polygonPoints(20 + burst * 3, 6, counterRotation * 0.45 + 30)}" fill="none" stroke="${COLORS.magenta}" stroke-width="1" opacity="${(ringPower * 0.9).toFixed(3)}"/><circle cx="${CX}" cy="${CY}" r="${coreRadius.toFixed(2)}" fill="url(#core-gradient)" opacity="${(0.58 + corePower * 0.42).toFixed(3)}" filter="url(#glow-cyan)"/><path d="M80 91h5l3-7 4 14 3-7h5" fill="none" stroke="${COLORS.white}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="${(0.35 + corePower * 0.65).toFixed(3)}"/><circle cx="${CX}" cy="${CY}" r="2.2" fill="${COLORS.white}" opacity="${(0.4 + corePower * 0.6).toFixed(3)}"/>`
  const waves = `${shockWave(time, 0.51, 0.18, COLORS.cyan)}${shockWave(time, 0.56, 0.2, COLORS.magenta)}`
  const scans = burst > 0.04 ? `<g opacity="${(burst * 0.75).toFixed(3)}"><rect x="18" y="${(CY - 18 + (frame % 7) * 5).toFixed(2)}" width="140" height=".7" fill="${COLORS.cyan}"/><rect x="35" y="${(CY + 16 - (frame % 5) * 6).toFixed(2)}" width="106" height=".6" fill="${COLORS.magenta}"/></g>` : ''
  const statusLine = `<g font-family="ui-monospace,Menlo,monospace" text-anchor="middle"><text x="${CX}" y="188" fill="${time >= 0.53 && time < 0.88 ? COLORS.cyan : COLORS.muted}" font-size="6" font-weight="700" letter-spacing="1.2" opacity="${(0.55 + ringPower * 0.45).toFixed(3)}">${status}</text><path d="M49 181h18M109 181h18" stroke="${COLORS.trace}" stroke-width=".8"/></g>`

  return `${definitions}<rect width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}" fill="#020605"/>${frameHud}${circuits}${convergingParticles(time, frame)}${rings}${orbitingParticles(stablePower, frame)}${waves}${ignitionRays(burst, frame)}${core}${scans}${statusLine}`
}

function aodCoreFrame(): string {
  const traces = CIRCUIT_PATHS.map((pathDefinition) => `<path d="${pathDefinition.d}" fill="none" stroke="#245047" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${pathDefinition.padX}" cy="${pathDefinition.padY}" r="2.5" fill="#020605" stroke="#397c70" stroke-width="1"/>`).join('')
  return `<rect width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}" fill="#000000"/>${traces}<g fill="none" stroke="#397c70"><circle cx="${CX}" cy="${CY}" r="55" stroke-width=".7" stroke-dasharray="11 9 2 9"/><circle cx="${CX}" cy="${CY}" r="40" stroke-width=".9" stroke-dasharray="18 12"/><polygon points="${polygonPoints(25, 6, 30)}" fill="#010403" stroke-width="1.1"/></g><circle cx="${CX}" cy="${CY}" r="10" fill="#0d2d28" stroke="#4c9a8c" stroke-width="1"/><path d="M80 91h5l3-7 4 14 3-7h5" fill="none" stroke="#5ca99b" stroke-width="1.2"/><text x="${CX}" y="188" fill="#397c70" font-family="ui-monospace,Menlo,monospace" font-size="6" font-weight="700" letter-spacing="1.2" text-anchor="middle">VOID-LINK // SLEEP</text>`
}

async function generateAnimation(): Promise<void> {
  const animationDirectory = path.join(assetRoot, 'anim')
  await mkdir(animationDirectory, { recursive: true })
  const existingFrames = await readdir(animationDirectory)
  await Promise.all(existingFrames
    .filter((name) => /^link-\d+\.(?:png|svg)$/.test(name))
    .map((name) => rm(path.join(animationDirectory, name))))
  await Promise.all(Array.from({ length: FRAME_COUNT }, (_, index) => {
    const name = `link-${String(index).padStart(2, '0')}.png`
    return writeIndexedFrame(`anim/${name}`, animationFrame(index))
  }))
}

function label(text: string, color = COLORS.muted): string {
  return `<text x="0" y="8" fill="${color}" font-family="ui-monospace,Menlo,monospace" font-size="8" font-weight="700" letter-spacing="1.4">${text}</text>`
}

async function generateDecor(): Promise<void> {
  await Promise.all([
    write('labels/title.svg', 150, 11, label('VOID-LINK // O66', COLORS.mint)),
    write('labels/date.svg', 54, 11, label('EARTH DATE')),
    write('decor/colon.svg', 8, 58, `<g fill="${COLORS.muted}"><circle cx="4" cy="19" r="2.4"/><circle cx="4" cy="39" r="2.4"/></g>`),
    write('decor/colon-aod.svg', 8, 58, '<g fill="#2f6e64"><circle cx="4" cy="19" r="2.1"/><circle cx="4" cy="39" r="2.1"/></g>'),
    write('decor/slash.svg', 7, 18, `<path d="m6 1-5 16" stroke="${COLORS.trace}" stroke-width="1.5" stroke-linecap="round"/>`),
    // Static low-energy reactor for AOD; animation in AOD would waste battery.
    write('decor/link-static.svg', FRAME_WIDTH, FRAME_HEIGHT, aodCoreFrame()),
  ])
}

await Promise.all([
  generateDigitSet('digits-hour', 28, 58, 4, COLORS.copper, COLORS.copperDim),
  generateDigitSet('digits-minute', 28, 58, 4, COLORS.cyan, COLORS.cyanDim),
  generateDigitSet('digits-small', 10, 18, 2, COLORS.mint, COLORS.trace),
  generateDigitSet('digits-aod', 28, 58, 4, '#397c70', '#102d29'),
  generateAnimation(),
  generateDecor(),
])

console.log(`Generated circuit-link assets in ${assetRoot}`)
