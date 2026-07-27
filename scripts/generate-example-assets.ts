import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assetRoot = path.join(repositoryRoot, 'examples', 'minimal-amoled', 'assets')

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

function sevenSegment(width: number, height: number, thickness: number, active: string[]): string {
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
  return `<g fill="#f4f7f8">${active.map((segment) => segments[segment]).join('')}</g>`
}

async function generateDigits(): Promise<void> {
  for (const [name, active] of Object.entries(SEGMENTS)) {
    await Promise.all([
      write(`digits-large/${name}.svg`, 45, 88, sevenSegment(45, 88, 7, active)),
      write(`digits-small/${name}.svg`, 13, 24, sevenSegment(13, 24, 2, active)),
    ])
  }
}

function battery(level: number): string {
  const fillWidth = Math.round(17 * level / 100)
  return `<g fill="none" stroke="#f4f7f8" stroke-width="1.5"><rect x="1" y="2" width="21" height="10" rx="2"/><path d="M23 5h2v4h-2"/></g><rect x="3" y="4" width="${fillWidth}" height="6" rx="1" fill="${level <= 20 ? '#ff6977' : '#b9ff3d'}"/>`
}

async function generateIcons(): Promise<void> {
  await Promise.all([
    ...[0, 20, 50, 80, 100].map((level) => write(`battery/${level}.svg`, 26, 14, battery(level))),
    write('icons/heart.svg', 26, 24, '<path d="M13 21C6 16.5 2 12.8 2 7.8 2 4.5 4.6 2 7.8 2c2.1 0 4.1 1.2 5.2 3 1.1-1.8 3.1-3 5.2-3C21.4 2 24 4.5 24 7.8c0 5-4 8.7-11 13.2Z" fill="none" stroke="#ff6677" stroke-width="2" stroke-linejoin="round"/>'),
    write('icons/steps.svg', 26, 24, '<g fill="#b9ff3d"><path d="M8.8 2c2.1 0 3.3 2.3 2.3 4.1L8.5 11c-.8 1.5-2.8 1.9-4.1.8-1.2-1-1.3-2.8-.3-4l2.7-4.6A2.3 2.3 0 0 1 8.8 2Z"/><path d="M17.3 11.3c2 0 3.3 2.1 2.4 3.9l-2.2 4.5c-.8 1.6-2.8 2.1-4.2 1-1.3-1-1.5-2.9-.4-4.2l2.4-4.1c.4-.7 1.2-1.1 2-1.1Z"/></g>'),
    write('units/percent.svg', 10, 24, '<g fill="none" stroke="#8996a1" stroke-width="1.6"><circle cx="2.5" cy="6" r="1.8"/><circle cx="7.5" cy="18" r="1.8"/><path d="m8.5 4-7 16"/></g>'),
    write('units/degree-c.svg', 14, 24, '<circle cx="3.5" cy="5" r="2.2" fill="none" stroke="#8996a1" stroke-width="1.5"/><path d="M13 9.5a5 5 0 1 0 0 9" fill="none" stroke="#8996a1" stroke-width="1.7" stroke-linecap="round"/>'),
    write('date/slash.svg', 10, 24, '<path d="m8 2-6 20" stroke="#56626d" stroke-width="2" stroke-linecap="round"/>'),
    write('accent/line.svg', 120, 3, '<rect width="120" height="3" rx="1.5" fill="#18232c"/><rect width="42" height="3" rx="1.5" fill="#b9ff3d"/>'),
    write('progress/background.svg', 120, 6, '<rect width="120" height="6" rx="3" fill="#18232c"/>'),
    write('progress/foreground.svg', 120, 6, '<rect width="120" height="6" rx="3" fill="#b9ff3d"/>'),
  ])
}

async function generateWeather(): Promise<void> {
  await Promise.all([
    write('weather/clear.svg', 30, 30, '<g fill="none" stroke="#ffc94f" stroke-width="1.8" stroke-linecap="round"><circle cx="15" cy="15" r="5"/><path d="M15 2v4M15 24v4M2 15h4M24 15h4M5.8 5.8l2.8 2.8M21.4 21.4l2.8 2.8M24.2 5.8l-2.8 2.8M8.6 21.4l-2.8 2.8"/></g>'),
    write('weather/cloudy.svg', 30, 30, '<path d="M8 23h14a6 6 0 0 0 .7-12A8.5 8.5 0 0 0 6.4 13 5 5 0 0 0 8 23Z" fill="none" stroke="#aebdca" stroke-width="2"/>'),
    write('weather/rain.svg', 30, 30, '<path d="M8 18h14a6 6 0 0 0 .7-12A8.5 8.5 0 0 0 6.4 8 5 5 0 0 0 8 18Z" fill="none" stroke="#aebdca" stroke-width="2"/><g stroke="#60b9ff" stroke-width="2" stroke-linecap="round"><path d="m9 22-1 4M16 22l-1 4M23 22l-1 4"/></g>'),
    write('weather/snow.svg', 30, 30, '<path d="M8 17h14a6 6 0 0 0 .7-12A8.5 8.5 0 0 0 6.4 7 5 5 0 0 0 8 17Z" fill="none" stroke="#aebdca" stroke-width="2"/><g fill="#d9f3ff"><circle cx="9" cy="23" r="1.5"/><circle cx="16" cy="26" r="1.5"/><circle cx="23" cy="22" r="1.5"/></g>'),
    write('weather/fog.svg', 30, 30, '<g fill="none" stroke="#9caab5" stroke-width="2" stroke-linecap="round"><path d="M5 10h20M2 15h21M7 20h21"/></g>'),
    write('weather/unknown.svg', 30, 30, '<circle cx="15" cy="15" r="11" fill="none" stroke="#697784" stroke-width="2"/><path d="M12 11a3.3 3.3 0 1 1 5 2.8c-1.6.9-2 1.4-2 3" fill="none" stroke="#a0adb7" stroke-width="2" stroke-linecap="round"/><circle cx="15" cy="22" r="1.2" fill="#a0adb7"/>'),
  ])
}

await Promise.all([generateDigits(), generateIcons(), generateWeather()])
console.log(`Generated example assets in ${assetRoot}`)