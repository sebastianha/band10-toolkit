import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assetRoot = path.join(repositoryRoot, 'examples', 'flux-core', 'assets')

const COLORS = {
  copper: '#ff9b4a',
  copperDim: '#6e351d',
  cyan: '#59ffe3',
  cyanDim: '#174e49',
  mint: '#dffff6',
  green: '#8dff83',
  trace: '#29433d',
  muted: '#68837b',
  red: '#ff6577',
  amber: '#ffc65a',
}

function document(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>\n`
}

async function write(relative: string, width: number, height: number, body: string): Promise<void> {
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
  return `<g fill="${inactive}" opacity=".28">${all}</g><g fill="${color}">${lit}</g>`
}

async function generateDigitSet(directory: string, width: number, height: number, thickness: number, color: string, inactive: string): Promise<void> {
  await Promise.all(Object.entries(SEGMENTS).map(([name, active]) => write(
    `${directory}/${name}.svg`,
    width,
    height,
    traceDigit(width, height, thickness, color, inactive, active),
  )))
}

function textLabel(text: string, color = COLORS.muted, suffix = ''): string {
  return `<text x="0" y="7" fill="${color}" font-family="ui-monospace,Menlo,monospace" font-size="7" font-weight="700" letter-spacing="1">${text}</text>${suffix}`
}

function battery(level: number): string {
  const fillWidth = Math.round(17 * level / 100)
  const fill = level <= 20 ? COLORS.red : level <= 50 ? COLORS.amber : COLORS.cyan
  return `<g fill="none" stroke="${COLORS.muted}" stroke-width="1.3"><rect x="1" y="2" width="21" height="10" rx="2"/><path d="M23 5h2v4h-2"/></g><rect x="3" y="4" width="${fillWidth}" height="6" rx="1" fill="${fill}"/>`
}

async function generateDecor(): Promise<void> {
  const header = [
    `<text x="0" y="8" fill="${COLORS.mint}" font-family="ui-monospace,Menlo,monospace" font-size="8" font-weight="700" letter-spacing="1.4">FLUX // CORE</text>`,
    `<path d="M91 7h18l6-5h18" fill="none" stroke="${COLORS.trace}" stroke-width="1.4"/>`,
    `<circle cx="109" cy="7" r="2" fill="#020605" stroke="${COLORS.cyan}" stroke-width="1.2"/>`,
    `<circle cx="133" cy="2" r="2" fill="${COLORS.copper}"/>`,
    `<path d="M0 17h54l5-5h18M87 17h55" fill="none" stroke="${COLORS.copperDim}" stroke-width="1"/>`,
    `<circle cx="77" cy="12" r="1.6" fill="${COLORS.copper}"/>`,
  ].join('')

  const inductor = [
    `<rect x=".75" y=".75" width="158.5" height="92.5" rx="10" fill="#07100e" stroke="${COLORS.trace}" stroke-width="1.5"/>`,
    `<text x="12" y="15" fill="${COLORS.copper}" font-family="ui-monospace,Menlo,monospace" font-size="8" font-weight="700" letter-spacing="1">L1</text>`,
    `<text x="117" y="15" fill="${COLORS.muted}" font-family="ui-monospace,Menlo,monospace" font-size="7" font-weight="700" letter-spacing=".8">47uH</text>`,
    `<path d="M12 52h15c0-22 16-22 16 0s16 22 16 0 16-22 16 0 16 22 16 0 16-22 16 0 16 22 16 0h15" fill="none" stroke="${COLORS.copper}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<circle cx="12" cy="52" r="5" fill="#07100e" stroke="${COLORS.cyan}" stroke-width="1.8"/><circle cx="148" cy="52" r="5" fill="#07100e" stroke="${COLORS.cyan}" stroke-width="1.8"/>`,
    `<path d="M35 27c22-13 68-13 90 0M35 77c22 13 68 13 90 0" fill="none" stroke="${COLORS.cyanDim}" stroke-width="1.2" stroke-dasharray="3 3"/>`,
    `<path d="M49 23c17-7 45-7 62 0M49 81c17 7 45 7 62 0" fill="none" stroke="${COLORS.cyan}" stroke-opacity=".55" stroke-width="1"/>`,
    `<text x="52" y="90" fill="${COLORS.muted}" font-family="ui-monospace,Menlo,monospace" font-size="6" font-weight="700" letter-spacing="1">MAGNETIC FIELD</text>`,
  ].join('')

  const inductorAod = [
    `<path d="M4 35h12c0-17 13-17 13 0s13 17 13 0 13-17 13 0 13 17 13 0 13-17 13 0 13 17 13 0h12" fill="none" stroke="#29685f" stroke-width="2.6" stroke-linecap="round"/>`,
    `<circle cx="4" cy="35" r="3" fill="#000" stroke="#23584f"/><circle cx="116" cy="35" r="3" fill="#000" stroke="#23584f"/>`,
    `<path d="M22 12c18-10 58-10 76 0M22 58c18 10 58 10 76 0" fill="none" stroke="#183c38" stroke-width="1" stroke-dasharray="3 4"/>`,
  ].join('')

  const bus = `<path d="M0 5h36l6-5h26l6 5h76" fill="none" stroke="${COLORS.trace}" stroke-width="1.2"/><g fill="${COLORS.cyan}"><circle cx="0" cy="5" r="2"/><circle cx="74" cy="5" r="2"/><circle cx="150" cy="5" r="2"/></g>`
  const footer = `<path d="M0 5h22l5-5h22l5 5h32l5-5h22l5 5h4" fill="none" stroke="${COLORS.trace}" stroke-width="1"/><g fill="${COLORS.copper}"><circle cx="0" cy="5" r="1.7"/><circle cx="54" cy="5" r="1.7"/><circle cx="122" cy="5" r="1.7"/></g>`

  await Promise.all([
    write('decor/header.svg', 142, 20, header),
    write('decor/inductor.svg', 160, 94, inductor),
    write('decor/inductor-aod.svg', 120, 70, inductorAod),
    write('decor/bus.svg', 150, 8, bus),
    write('decor/footer.svg', 122, 8, footer),
    write('decor/colon.svg', 8, 58, `<g fill="${COLORS.muted}"><circle cx="4" cy="19" r="2.4"/><circle cx="4" cy="39" r="2.4"/></g>`),
    write('decor/colon-aod.svg', 8, 58, '<g fill="#2f6e64"><circle cx="4" cy="19" r="2.1"/><circle cx="4" cy="39" r="2.1"/></g>'),
    write('decor/slash.svg', 7, 18, `<path d="m6 1-5 16" stroke="${COLORS.trace}" stroke-width="1.5" stroke-linecap="round"/>`),
  ])
}

async function generateLabelsAndSignals(): Promise<void> {
  await Promise.all([
    write('labels/date.svg', 30, 9, textLabel('DATE')),
    write('labels/vcc.svg', 30, 9, textLabel('VCC', COLORS.copper)),
    write('labels/clock.svg', 70, 9, textLabel('LOCAL CLOCK', COLORS.cyan)),
    write('labels/steps.svg', 64, 9, textLabel('STEP COUNT')),
    write('labels/heart.svg', 68, 9, textLabel('HEART RATE')),
    write('labels/weather.svg', 54, 9, textLabel('WEATHER')),
    write('labels/aod.svg', 112, 9, textLabel('L1 / LOW POWER', '#356f66')),
    write('units/percent.svg', 8, 18, `<text x="0" y="14" fill="${COLORS.muted}" font-family="ui-monospace,Menlo,monospace" font-size="10" font-weight="700">%</text>`),
    write('units/bpm.svg', 22, 18, `<text x="0" y="14" fill="${COLORS.muted}" font-family="ui-monospace,Menlo,monospace" font-size="8" font-weight="700" letter-spacing=".5">BPM</text>`),
    write('units/degree-c.svg', 14, 18, `<text x="0" y="14" fill="${COLORS.muted}" font-family="ui-monospace,Menlo,monospace" font-size="9" font-weight="700">°C</text>`),
    write('signals/steps.svg', 38, 22, `<rect x=".75" y=".75" width="36.5" height="20.5" rx="5" fill="#07100e" stroke="${COLORS.trace}" stroke-width="1.5"/><path d="M5 14h5V8h6v6h6V6h6v8h5" fill="none" stroke="${COLORS.green}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="5" cy="14" r="1.5" fill="${COLORS.copper}"/><circle cx="33" cy="14" r="1.5" fill="${COLORS.cyan}"/>`),
    write('signals/heart.svg', 38, 22, `<rect x=".75" y=".75" width="36.5" height="20.5" rx="5" fill="#07100e" stroke="${COLORS.trace}" stroke-width="1.5"/><path d="M4 12h7l3-6 5 12 4-9 3 3h8" fill="none" stroke="${COLORS.red}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="12" r="1.4" fill="${COLORS.copper}"/><circle cx="34" cy="12" r="1.4" fill="${COLORS.cyan}"/>`),
  ])
}

async function generateBatteryAndWeather(): Promise<void> {
  await Promise.all([
    ...[0, 20, 50, 80, 100].map((level) => write(`battery/${level}.svg`, 26, 14, battery(level))),
    write('weather/clear.svg', 24, 24, `<g fill="none" stroke="${COLORS.amber}" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></g>`),
    write('weather/cloud.svg', 24, 24, `<path d="M6 18h12a4.7 4.7 0 0 0 .5-9.3A7 7 0 0 0 5.2 10 4 4 0 0 0 6 18Z" fill="none" stroke="${COLORS.cyan}" stroke-width="1.7"/>`),
    write('weather/rain.svg', 24, 24, `<path d="M6 15h12a4.7 4.7 0 0 0 .5-9.3A7 7 0 0 0 5.2 7 4 4 0 0 0 6 15Z" fill="none" stroke="${COLORS.cyan}" stroke-width="1.7"/><path d="m8 18-1 3M13 18l-1 3M18 18l-1 3" stroke="#6bbcff" stroke-width="1.5" stroke-linecap="round"/>`),
    write('weather/snow.svg', 24, 24, `<path d="M6 14h12a4.7 4.7 0 0 0 .5-9.3A7 7 0 0 0 5.2 6 4 4 0 0 0 6 14Z" fill="none" stroke="${COLORS.cyan}" stroke-width="1.7"/><g fill="#d9fff8"><circle cx="8" cy="19" r="1.2"/><circle cx="13" cy="21" r="1.2"/><circle cx="18" cy="18" r="1.2"/></g>`),
    write('weather/fog.svg', 24, 24, `<path d="M3 8h18M1 13h18M5 18h18" fill="none" stroke="${COLORS.muted}" stroke-width="1.7" stroke-linecap="round"/>`),
    write('weather/dust.svg', 24, 24, `<path d="M3 7h12c4 0 4 5 0 5H9M4 17h15c4 0 4-5 0-5" fill="none" stroke="${COLORS.copper}" stroke-width="1.6" stroke-linecap="round"/><circle cx="4" cy="12" r="1" fill="${COLORS.amber}"/>`),
    write('weather/unknown.svg', 24, 24, `<circle cx="12" cy="12" r="9" fill="none" stroke="${COLORS.trace}" stroke-width="1.7"/><path d="M9.5 9a2.8 2.8 0 1 1 4.2 2.4c-1.3.8-1.7 1.2-1.7 2.5" fill="none" stroke="${COLORS.muted}" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="17.5" r="1" fill="${COLORS.muted}"/>`),
  ])
}

await Promise.all([
  generateDigitSet('digits-hour', 28, 58, 4, COLORS.copper, COLORS.copperDim),
  generateDigitSet('digits-minute', 28, 58, 4, COLORS.cyan, COLORS.cyanDim),
  generateDigitSet('digits-small', 10, 18, 2, COLORS.mint, COLORS.trace),
  generateDigitSet('digits-aod', 28, 58, 4, '#397c70', '#102d29'),
  generateDecor(),
  generateLabelsAndSignals(),
  generateBatteryAndWeather(),
])

console.log(`Generated Flux Core assets in ${assetRoot}`)