import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import {
  DEFAULT_SIMULATION,
  formatNumberValue,
  getSourceValue,
  selectImageListItem,
  type DigitSet,
  type LoadedProject,
  type SimulationState,
  type WatchFaceTheme,
  type WatchFaceWidget,
} from '../core/index.ts'
import { requireStagedAsset, type StagedAsset, type StagedAssetMap } from './assets.ts'

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

async function imageData(asset: StagedAsset): Promise<string> {
  return `data:image/png;base64,${(await readFile(asset.outputPath)).toString('base64')}`
}

async function imageElement(asset: StagedAsset, x: number, y: number, opacity = 1, extra = ''): Promise<string> {
  return `<image href="${await imageData(asset)}" x="${x}" y="${y}" width="${asset.width}" height="${asset.height}" opacity="${opacity}" ${extra}/>`
}

async function renderNumber(
  widget: Extract<WatchFaceWidget, { type: 'number' }>,
  digitSet: DigitSet,
  simulation: SimulationState,
  assets: StagedAssetMap,
): Promise<string> {
  const value = getSourceValue(widget.source, simulation)
  const text = formatNumberValue(value, widget.digits, widget.leadingZero ?? false)
  const glyphAssets = [...text].map((character) => requireStagedAsset(assets, character === '-' ? digitSet.minus : digitSet.digits[Number(character)] ?? digitSet.digits[0]))
  const spacing = widget.spacing ?? 0
  const width = glyphAssets.reduce((total, asset) => total + asset.width, 0) + Math.max(0, glyphAssets.length - 1) * spacing
  let x = widget.x
  if (widget.align === 'center') x -= width / 2
  if (widget.align === 'right') x -= width
  const output: string[] = []
  for (const asset of glyphAssets) {
    output.push(await imageElement(asset, x, widget.y, widget.opacity ?? 1))
    x += asset.width + spacing
  }
  if (widget.unitAsset) {
    const unit = requireStagedAsset(assets, widget.unitAsset)
    output.push(await imageElement(unit, x, widget.y, widget.opacity ?? 1))
  }
  return output.join('')
}

async function renderProgress(
  widget: Extract<WatchFaceWidget, { type: 'progress' }>,
  simulation: SimulationState,
  assets: StagedAssetMap,
): Promise<string> {
  const foreground = requireStagedAsset(assets, widget.foreground)
  const background = widget.background ? requireStagedAsset(assets, widget.background) : undefined
  const ratio = Math.max(0, Math.min(1, getSourceValue(widget.source, simulation) / widget.maximum))
  const opacity = widget.opacity ?? 1
  if (widget.shape === 'bar') {
    const clipId = `progress-${escapeXml(widget.id)}`
    const parts = background ? [await imageElement(background, widget.x, widget.y, opacity)] : []
    parts.push(`<defs><clipPath id="${clipId}"><rect x="${widget.x}" y="${widget.y}" width="${widget.width * ratio}" height="${widget.height}"/></clipPath></defs>`)
    parts.push(await imageElement(foreground, widget.x, widget.y, opacity, `clip-path="url(#${clipId})" preserveAspectRatio="none"`))
    return parts.join('')
  }
  const radius = Math.max(1, Math.min(widget.width, widget.height) / 2 - widget.thickness / 2)
  const circumference = 2 * Math.PI * radius
  const centerX = widget.x + widget.width / 2
  const centerY = widget.y + widget.height / 2
  const rotation = (widget.startAngle ?? -90) - 90
  const backgroundStroke = background?.dominantColor ?? '#1a2029'
  return `<g opacity="${opacity}" transform="rotate(${rotation} ${centerX} ${centerY})"><circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${backgroundStroke}" stroke-width="${widget.thickness}"/><circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${foreground.dominantColor}" stroke-width="${widget.thickness}" stroke-linecap="round" stroke-dasharray="${circumference * ratio} ${circumference}"/></g>`
}

async function renderWidget(
  widget: WatchFaceWidget,
  project: LoadedProject,
  simulation: SimulationState,
  assets: StagedAssetMap,
): Promise<string> {
  if (widget.visible === false) return ''
  switch (widget.type) {
    case 'image': return imageElement(requireStagedAsset(assets, widget.asset), widget.x, widget.y, widget.opacity ?? 1)
    case 'number': {
      const digitSet = project.layout.assets.digitSets[widget.digitSet]
      if (!digitSet) throw new Error(`Unknown digit set ${widget.digitSet}`)
      return renderNumber(widget, digitSet, simulation, assets)
    }
    case 'image-list': {
      const item = selectImageListItem(widget.items, getSourceValue(widget.source, simulation), widget.fallback)
      return item ? imageElement(requireStagedAsset(assets, item.asset), widget.x, widget.y, widget.opacity ?? 1) : ''
    }
    case 'progress': return renderProgress(widget, simulation, assets)
    case 'animation': {
      const timestamp = new Date(simulation.dateTime).getTime()
      const frame = widget.frames[Math.abs(Math.floor(timestamp / widget.intervalMs)) % widget.frames.length]
      return frame ? imageElement(requireStagedAsset(assets, frame), widget.x, widget.y, widget.opacity ?? 1) : ''
    }
  }
}

export async function renderThemeSvg(
  project: LoadedProject,
  theme: WatchFaceTheme,
  assets: StagedAssetMap,
  simulation: SimulationState = DEFAULT_SIMULATION,
): Promise<string> {
  const widgets = [...theme.widgets].sort((left, right) => left.z - right.z)
  const rendered = await Promise.all(widgets.map((widget) => renderWidget(widget, project, simulation, assets)))
  const { width, height, clip } = project.layout.canvas
  const clipDefinition = clip === 'pill'
    ? `<defs><clipPath id="screen"><rect width="${width}" height="${height}" rx="${width / 2}"/></clipPath></defs>`
    : '<defs><clipPath id="screen"><rect width="100%" height="100%"/></clipPath></defs>'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${clipDefinition}<g clip-path="url(#screen)"><rect width="${width}" height="${height}" fill="${escapeXml(theme.background)}"/>${rendered.join('')}</g></svg>`
}

export async function renderPreviewPng(
  project: LoadedProject,
  theme: WatchFaceTheme,
  assets: StagedAssetMap,
  outputPath: string,
  simulation: SimulationState = DEFAULT_SIMULATION,
): Promise<void> {
  const svg = await renderThemeSvg(project, theme, assets, simulation)
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: false }).toFile(outputPath)
}