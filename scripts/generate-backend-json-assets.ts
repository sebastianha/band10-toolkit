import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const converter = require('nepali-date-converter') as { default: new (date: Date) => { format: (format: string, language?: 'np' | 'en') => string } }
const NepaliDate = converter.default

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exampleRoot = path.join(repositoryRoot, 'examples', 'backend-json')
const assetRoot = path.join(exampleRoot, 'assets')

const C = {
  bg: '#000000',
  clock: '#FFFFFF',
  key: '#4FC3F7',
  str: '#66BB6A',
  num: '#FFB74D',
  pun: '#9E9E9E',
  brace: '#E0E0E0',
  meta: '#6E6E6E',
  aodClock: '#B0B0B0',
  aodJson: '#5A5A5A',
}

const FONT = "'JetBrains Mono','Fira Code','Cascadia Mono','IBM Plex Mono',ui-monospace,'DejaVu Sans Mono',Menlo,monospace"
const DEV_FONT = "'Kohinoor Devanagari','Devanagari Sangam MN','Noto Sans Devanagari','Mukta',sans-serif"

// Bigger monospace grid than before, with generous side margins so nothing is
// clipped by the AMOLED's rounded edges.
const CELL = 9
const FSIZE = 15
const ROW_H = 22
const BASELINE = 17
const BASE_X = 24
const RIGHT_LIMIT = 188
const JSON_TOP = 148
const LINE_H = 28

interface Token { t: string; c: string }

function document(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>\n`
}

async function writeAsset(relative: string, width: number, height: number, body: string): Promise<void> {
  const output = path.join(assetRoot, relative)
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, document(width, height, body))
}

function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function monoBody(tokens: Token[], cell = CELL, baseline = BASELINE, fontSize = FSIZE, weight = 500): { body: string; cols: number } {
  const glyphs: string[] = []
  let col = 0
  for (const token of tokens) {
    for (const char of token.t) {
      if (char !== ' ') {
        glyphs.push(`<text x="${col * cell + cell / 2}" y="${baseline}" text-anchor="middle" font-family="${FONT}" font-size="${fontSize}" font-weight="${weight}" fill="${token.c}">${escapeText(char)}</text>`)
      }
      col += 1
    }
  }
  return { body: glyphs.join(''), cols: col }
}

function tokenLength(tokens: Token[]): number {
  return tokens.reduce((total, token) => total + token.t.length, 0)
}

async function writeMono(relative: string, tokens: Token[], height = ROW_H): Promise<number> {
  const { body, cols } = monoBody(tokens)
  await writeAsset(relative, Math.max(1, cols * CELL), height, body)
  return cols
}

async function generateDigitSet(directory: string, cell: number, height: number, fontSize: number, baseline: number, color: string, weight = 500): Promise<void> {
  const glyphs = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'minus']
  await Promise.all(glyphs.map((name) => {
    const char = name === 'minus' ? '-' : name
    const body = `<text x="${cell / 2}" y="${baseline}" text-anchor="middle" font-family="${FONT}" font-size="${fontSize}" font-weight="${weight}" fill="${color}">${char}</text>`
    return writeAsset(`${directory}/${name}.svg`, cell, height, body)
  }))
}

// Measure the rendered pixel width of an SVG body (used for Devanagari text,
// which is not monospace and cannot be placed on the fixed grid).
async function measureWidth(body: string, height: number): Promise<number> {
  const { info } = await sharp(Buffer.from(document(320, height, body))).trim().toBuffer({ resolveWithObject: true })
  return info.width
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function numberPrefix(key: string): Token[] {
  return [{ t: ' ', c: C.pun }, { t: '"', c: C.pun }, { t: key, c: C.key }, { t: '"', c: C.pun }, { t: ':', c: C.pun }, { t: ' ', c: C.pun }]
}
function stringPrefix(key: string): Token[] {
  return [...numberPrefix(key), { t: '"', c: C.pun }]
}

interface Widget { [key: string]: unknown }
const widgets: Widget[] = []
const assetJobs: Promise<unknown>[] = []
let lineIndex = 0
function lineY(): number {
  const y = JSON_TOP + lineIndex * LINE_H
  lineIndex += 1
  return y
}
function pushPrefix(id: string, tokens: Token[], y: number): number {
  const cols = tokenLength(tokens)
  assetJobs.push(writeAsset(`tok/${id}.svg`, cols * CELL, ROW_H, monoBody(tokens).body))
  widgets.push({ id: `${id}-key`, label: `${id} key`, type: 'image', asset: `assets/tok/${id}.svg`, x: BASE_X, y, z: 3, allowOverlap: true, locked: true })
  return cols
}

function currentMonthAnchor(): { year: number; month: number } {
  const override = process.env.UTSAB_AD_MONTH
  if (override) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(override)
    if (!match) throw new Error('UTSAB_AD_MONTH must be YYYY-MM')
    return { year: Number(match[1]), month: Number(match[2]) - 1 }
  }
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

async function build(): Promise<void> {
  await Promise.all([
    generateDigitSet('digits-clock', 32, 70, 58, 53, C.clock, 700),
    generateDigitSet('digits-num', CELL, ROW_H, FSIZE, BASELINE, C.num),
    generateDigitSet('digits-str', CELL, ROW_H, FSIZE, BASELINE, C.str),
    generateDigitSet('digits-clock-aod', 32, 70, 58, 53, C.aodClock, 700),
    generateDigitSet('digits-aod', CELL, ROW_H, FSIZE, BASELINE, C.aodJson),
    ...MONTHS.map((name, index) => writeAsset(`month/${index + 1}.svg`, 3 * CELL, ROW_H, monoBody([{ t: name, c: C.str }]).body)),
    ...WEEKDAYS.map((name, index) => writeAsset(`weekday/${index}.svg`, 5 * CELL, ROW_H, monoBody([{ t: name, c: C.str }, { t: '",', c: C.pun }]).body)),
    writeAsset('tok/clock-colon.svg', 16, 70, `<g fill="${C.clock}"><circle cx="8" cy="28" r="3.6"/><circle cx="8" cy="48" r="3.6"/></g>`),
    writeAsset('tok/clock-colon-aod.svg', 16, 70, `<g fill="${C.aodClock}"><circle cx="8" cy="28" r="3.2"/><circle cx="8" cy="48" r="3.2"/></g>`),
    writeMono('tok/filename.svg', [{ t: 'utsab.json', c: C.meta }], 18),
    writeMono('tok/comma.svg', [{ t: ',', c: C.pun }]),
    writeMono('tok/close-str.svg', [{ t: '",', c: C.pun }]),
    writeMono('tok/pct-close.svg', [{ t: '%', c: C.str }, { t: '"', c: C.pun }]),
    writeMono('tok/brace-open.svg', [{ t: '{', c: C.brace }]),
    writeMono('tok/brace-close.svg', [{ t: '}', c: C.brace }]),
    writeMono('tok/meta-status.svg', [{ t: 'status: 200 OK', c: C.meta }], 16),
    writeMono('tok/meta-env.svg', [{ t: 'env: production', c: C.meta }], 16),
    writeMono('tok/aod-steps.svg', [{ t: ' ', c: C.aodJson }, { t: '"steps":', c: C.aodJson }]),
    writeMono('tok/aod-battery.svg', [{ t: ' ', c: C.aodJson }, { t: '"battery":"', c: C.aodJson }]),
    writeMono('tok/aod-comma.svg', [{ t: ',', c: C.aodJson }]),
    writeMono('tok/aod-pct-close.svg', [{ t: '%"', c: C.aodJson }]),
    writeMono('tok/aod-brace-open.svg', [{ t: '{', c: C.aodJson }]),
    writeMono('tok/aod-brace-close.svg', [{ t: '}', c: C.aodJson }]),
  ])

  // --- Nepali date: measure Devanagari widths so they fit and align. ---
  const { year, month } = currentMonthAnchor()
  const monthCode = `${year}-${String(month + 1).padStart(2, '0')}`
  // Nepali key मिति ("date"). Pin the opening quote to column 1 and मिति to
  // column 2 so it lines up with the ASCII keys (Devanagari is proportional).
  const npQuoteX = CELL + CELL / 2
  const npKeyStartX = 2 * CELL
  const npSegBody = `<text x="0" y="${BASELINE}" font-family="${DEV_FONT}" font-size="${FSIZE}" font-weight="600"><tspan fill="${C.key}">\u092e\u093f\u0924\u093f</tspan><tspan fill="${C.pun}">": "</tspan></text>`
  const wSeg = Math.ceil(await measureWidth(npSegBody, ROW_H))
  const npKeyBody = `<text x="${npQuoteX}" y="${BASELINE}" text-anchor="middle" font-family="${DEV_FONT}" font-size="${FSIZE}" font-weight="600" fill="${C.pun}">"</text><text x="${npKeyStartX}" y="${BASELINE}" font-family="${DEV_FONT}" font-size="${FSIZE}" font-weight="600"><tspan fill="${C.key}">\u092e\u093f\u0924\u093f</tspan><tspan fill="${C.pun}">": "</tspan></text>`
  const npKeyW = npKeyStartX + wSeg + 4
  const npValueStart = BASE_X + npKeyStartX + wSeg

  // Pick a Devanagari value font size that fits within the right margin.
  const sample = new NepaliDate(new Date(Date.UTC(year, month, 15, 12))).format('MM/DD', 'np')
  let npValueFont = FSIZE
  let npValueW = 0
  for (const size of [FSIZE, 14, 13, 12, 11]) {
    const body = `<text x="0" y="${BASELINE}" font-family="${DEV_FONT}" font-size="${size}" font-weight="600" fill="${C.str}">${sample}"</text>`
    npValueW = Math.ceil(await measureWidth(body, ROW_H)) + 4
    npValueFont = size
    if (npValueStart + npValueW <= RIGHT_LIMIT) break
  }

  // Clock (top).
  const clockY = 44
  widgets.push(
    { id: 'hours', label: 'Hours', type: 'number', source: 'hour', digitSet: 'clock', digits: 2, align: 'left', spacing: 0, leadingZero: true, x: 34, y: clockY, z: 4, allowOverlap: true },
    { id: 'clock-colon', label: 'Clock colon', type: 'image', asset: 'assets/tok/clock-colon.svg', x: 98, y: clockY, z: 4, allowOverlap: true, locked: true },
    { id: 'minutes', label: 'Minutes', type: 'number', source: 'minute', digitSet: 'clock', digits: 2, align: 'left', spacing: 0, leadingZero: true, x: 114, y: clockY, z: 4, allowOverlap: true },
    { id: 'filename', label: 'Filename', type: 'image', asset: 'assets/tok/filename.svg', x: 106 - 5 * CELL, y: 118, z: 4, allowOverlap: true, locked: true },
  )

  // Line: {
  widgets.push({ id: 'brace-open', label: 'Open brace', type: 'image', asset: 'assets/tok/brace-open.svg', x: BASE_X, y: lineY(), z: 3, allowOverlap: true, locked: true })

  // Line: "date": "Jul 26",
  {
    const y = lineY()
    const cols = pushPrefix('p-date', stringPrefix('date'), y)
    const vx = BASE_X + cols * CELL
    widgets.push({ id: 'date-month', label: 'Month', type: 'image-list', source: 'month', fallback: 'exact', items: MONTHS.map((_, i) => ({ value: i + 1, asset: `assets/month/${i + 1}.svg` })), x: vx, y, z: 3, allowOverlap: true })
    widgets.push({ id: 'date-day', label: 'Day', type: 'number', source: 'day', digitSet: 'str', digits: 2, align: 'left', spacing: 0, leadingZero: true, unitAsset: 'assets/tok/close-str.svg', x: vx + 4 * CELL, y, z: 3, allowOverlap: true })
  }

  // Line: "day": "Sun",
  {
    const y = lineY()
    const cols = pushPrefix('p-day', stringPrefix('day'), y)
    widgets.push({ id: 'weekday', label: 'Weekday', type: 'image-list', source: 'weekday', fallback: 'exact', items: WEEKDAYS.map((_, i) => ({ value: i, asset: `assets/weekday/${i}.svg` })), x: BASE_X + cols * CELL, y, z: 3, allowOverlap: true })
  }

  // Line: "मिति": "२०८३/०४/१०"  (Nepali date, dynamic per day of the current month)
  {
    const y = lineY()
    await writeAsset('tok/p-nepali.svg', npKeyW, ROW_H, npKeyBody)
    widgets.push({ id: 'p-nepali-key', label: 'Nepali date key', type: 'image', asset: 'assets/tok/p-nepali.svg', x: BASE_X, y, z: 3, allowOverlap: true, locked: true })
    const items = Array.from({ length: 31 }, (_, i) => {
      const day = i + 1
      const value = new NepaliDate(new Date(Date.UTC(year, month, day, 12))).format('MM/DD', 'np')
      const body = `<text x="0" y="${BASELINE}" font-family="${DEV_FONT}" font-size="${npValueFont}" font-weight="600"><tspan fill="${C.str}">${value}</tspan><tspan fill="${C.pun}">"</tspan></text>`
      assetJobs.push(writeAsset(`nepali/day-${String(day).padStart(2, '0')}.svg`, npValueW, ROW_H, body))
      return { value: day, asset: `assets/nepali/day-${String(day).padStart(2, '0')}.svg` }
    })
    widgets.push({ id: 'nepali-date', label: 'Nepali date', type: 'image-list', source: 'day', fallback: 'exact', items, x: npValueStart, y, z: 3, allowOverlap: true })
  }

  // Line: "steps": 7218,
  {
    const y = lineY()
    const cols = pushPrefix('p-steps', numberPrefix('steps'), y)
    widgets.push({ id: 'steps', label: 'Steps', type: 'number', source: 'steps', digitSet: 'num', digits: 5, align: 'left', spacing: 0, leadingZero: false, unitAsset: 'assets/tok/comma.svg', x: BASE_X + cols * CELL, y, z: 3, allowOverlap: true })
  }

  // Line: "battery": "82%"
  {
    const y = lineY()
    const cols = pushPrefix('p-battery', stringPrefix('battery'), y)
    widgets.push({ id: 'battery', label: 'Battery', type: 'number', source: 'battery', digitSet: 'str', digits: 3, align: 'left', spacing: 0, leadingZero: false, unitAsset: 'assets/tok/pct-close.svg', x: BASE_X + cols * CELL, y, z: 3, allowOverlap: true })
  }

  // Line: }
  widgets.push({ id: 'brace-close', label: 'Close brace', type: 'image', asset: 'assets/tok/brace-close.svg', x: BASE_X, y: lineY(), z: 3, allowOverlap: true, locked: true })

  const metaY = JSON_TOP + lineIndex * LINE_H + 6
  widgets.push(
    { id: 'meta-status', label: 'Status metadata', type: 'image', asset: 'assets/tok/meta-status.svg', x: BASE_X, y: metaY, z: 3, allowOverlap: true, locked: true },
    { id: 'meta-env', label: 'Env metadata', type: 'image', asset: 'assets/tok/meta-env.svg', x: BASE_X, y: metaY + 24, z: 3, allowOverlap: true, locked: true },
  )

  await Promise.all(assetJobs)

  // --- AOD ---
  const aodClockY = 96
  const aodBraceY = 194
  const aodStepsY = aodBraceY + 30
  const aodBatteryY = aodStepsY + 30
  const aodCloseY = aodBatteryY + 30

  const layout = {
    $schema: '../../schemas/layout.schema.json',
    formatVersion: 1,
    canvas: { width: 212, height: 520, clip: 'pill' },
    assets: {
      digitSets: {
        clock: { digits: Array.from({ length: 10 }, (_, i) => `assets/digits-clock/${i}.svg`), minus: 'assets/digits-clock/minus.svg' },
        num: { digits: Array.from({ length: 10 }, (_, i) => `assets/digits-num/${i}.svg`), minus: 'assets/digits-num/minus.svg' },
        str: { digits: Array.from({ length: 10 }, (_, i) => `assets/digits-str/${i}.svg`), minus: 'assets/digits-str/minus.svg' },
        'clock-aod': { digits: Array.from({ length: 10 }, (_, i) => `assets/digits-clock-aod/${i}.svg`), minus: 'assets/digits-clock-aod/minus.svg' },
        aod: { digits: Array.from({ length: 10 }, (_, i) => `assets/digits-aod/${i}.svg`), minus: 'assets/digits-aod/minus.svg' },
      },
    },
    normal: { background: C.bg, widgets },
    aod: {
      enabled: true,
      background: '#000000',
      widgets: [
        { id: 'aod-hours', label: 'AOD hours', type: 'number', source: 'hour', digitSet: 'clock-aod', digits: 2, align: 'left', spacing: 0, leadingZero: true, x: 34, y: aodClockY, z: 1, allowOverlap: true },
        { id: 'aod-colon', label: 'AOD colon', type: 'image', asset: 'assets/tok/clock-colon-aod.svg', x: 98, y: aodClockY, z: 1, allowOverlap: true, locked: true },
        { id: 'aod-minutes', label: 'AOD minutes', type: 'number', source: 'minute', digitSet: 'clock-aod', digits: 2, align: 'left', spacing: 0, leadingZero: true, x: 114, y: aodClockY, z: 1, allowOverlap: true },
        { id: 'aod-brace-open', label: 'AOD open brace', type: 'image', asset: 'assets/tok/aod-brace-open.svg', x: BASE_X, y: aodBraceY, z: 1, allowOverlap: true, locked: true },
        { id: 'aod-steps-key', label: 'AOD steps key', type: 'image', asset: 'assets/tok/aod-steps.svg', x: BASE_X, y: aodStepsY, z: 1, allowOverlap: true, locked: true },
        { id: 'aod-steps', label: 'AOD steps', type: 'number', source: 'steps', digitSet: 'aod', digits: 5, align: 'left', spacing: 0, leadingZero: false, unitAsset: 'assets/tok/aod-comma.svg', x: BASE_X + 9 * CELL, y: aodStepsY, z: 1, allowOverlap: true },
        { id: 'aod-battery-key', label: 'AOD battery key', type: 'image', asset: 'assets/tok/aod-battery.svg', x: BASE_X, y: aodBatteryY, z: 1, allowOverlap: true, locked: true },
        { id: 'aod-battery', label: 'AOD battery', type: 'number', source: 'battery', digitSet: 'aod', digits: 3, align: 'left', spacing: 0, leadingZero: false, unitAsset: 'assets/tok/aod-pct-close.svg', x: BASE_X + 12 * CELL, y: aodBatteryY, z: 1, allowOverlap: true },
        { id: 'aod-brace-close', label: 'AOD close brace', type: 'image', asset: 'assets/tok/aod-brace-close.svg', x: BASE_X, y: aodCloseY, z: 1, allowOverlap: true, locked: true },
      ],
    },
  }

  await writeFile(path.join(exampleRoot, 'layout.json'), `${JSON.stringify(layout, null, 2)}\n`)
  console.log(`Generated utsab.json assets in ${assetRoot} (Nepali month ${monthCode}, value font ${npValueFont}px)`)
}

await build()
