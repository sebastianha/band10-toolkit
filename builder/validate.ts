import { open, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {
  BAND10_DEVICE,
  collectAssetReferences,
  type LoadedProject,
  type ValidationIssue,
  type ValidationReport,
  type WatchFaceWidget,
} from '../core/index.ts'
import { ProjectLoadError, loadProject, resolveProjectAsset } from './project.ts'

interface ImageMetadata {
  width: number
  height: number
  bytes: number
  hasAlpha: boolean
  indexed: boolean
}

interface WidgetBounds {
  left: number
  top: number
  right: number
  bottom: number
}

const PNG_SIGNATURE = Buffer.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)

// Read the PNG IHDR colour type (byte 25); type 3 is an indexed palette image,
// which the native packer stores at ~1 byte/pixel + RLE.
async function isIndexedPng(filePath: string): Promise<boolean> {
  if (!filePath.toLowerCase().endsWith('.png')) return false
  const handle = await open(filePath, 'r')
  try {
    const buffer = Buffer.alloc(26)
    await handle.read(buffer, 0, 26, 0)
    return buffer.subarray(0, 8).equals(PNG_SIGNATURE) && buffer[25] === 3
  } finally {
    await handle.close()
  }
}

async function metadataFor(filePath: string): Promise<ImageMetadata> {
  const [metadata, fileStat, indexed] = await Promise.all([sharp(filePath, { density: 72 }).metadata(), stat(filePath), isIndexedPng(filePath)])
  if (!metadata.width || !metadata.height) throw new Error('Image dimensions are unavailable')
  return { width: metadata.width, height: metadata.height, bytes: fileStat.size, hasAlpha: metadata.hasAlpha ?? false, indexed }
}

function issue(severity: ValidationIssue['severity'], code: string, message: string, issuePath?: string, hint?: string): ValidationIssue {
  return { severity, code, message, path: issuePath, hint }
}

function boundsForWidget(
  widget: WatchFaceWidget,
  project: LoadedProject,
  metadata: Map<string, ImageMetadata>,
): WidgetBounds | undefined {
  if (widget.type === 'progress') {
    return { left: widget.x, top: widget.y, right: widget.x + widget.width, bottom: widget.y + widget.height }
  }
  let reference: string | undefined
  let multiplier = 1
  if (widget.type === 'image') reference = widget.asset
  if (widget.type === 'image-list') reference = widget.items[0]?.asset
  if (widget.type === 'animation') reference = widget.frames[0]
  if (widget.type === 'number') {
    reference = project.layout.assets.digitSets[widget.digitSet]?.digits[0]
    multiplier = widget.digits
  }
  if (!reference) return undefined
  const image = metadata.get(reference)
  if (!image) return undefined
  const spacing = widget.type === 'number' ? (widget.spacing ?? 0) * Math.max(0, widget.digits - 1) : 0
  const unit = widget.type === 'number' && widget.unitAsset ? metadata.get(widget.unitAsset) : undefined
  const width = image.width * multiplier + spacing + (unit?.width ?? 0)
  const height = Math.max(image.height, unit?.height ?? 0)
  const left = widget.type === 'number'
    ? widget.align === 'center' ? widget.x - width / 2 : widget.align === 'right' ? widget.x - width : widget.x
    : widget.x
  return { left, top: widget.y, right: left + width, bottom: widget.y + height }
}

export async function validateLoadedProject(project: LoadedProject): Promise<ValidationReport> {
  const issues: ValidationIssue[] = []
  const references = collectAssetReferences(project.layout)
  const uniqueReferences = [...new Set(references.map((reference) => reference.path))]
  const metadata = new Map<string, ImageMetadata>()

  for (const reference of uniqueReferences) {
    let filePath: string
    try {
      filePath = resolveProjectAsset(project, reference)
    } catch (error) {
      issues.push(issue('error', 'ASSET_PATH_INVALID', error instanceof Error ? error.message : String(error), reference))
      continue
    }
    try {
      metadata.set(reference, await metadataFor(filePath))
    } catch (error) {
      issues.push(issue('error', 'ASSET_UNREADABLE', `Cannot read ${reference}: ${error instanceof Error ? error.message : String(error)}`, reference))
    }
  }

  if (project.manifest.preview !== 'generated') {
    try {
      await metadataFor(resolveProjectAsset(project, project.manifest.preview))
    } catch (error) {
      issues.push(issue('error', 'PREVIEW_UNREADABLE', `Cannot read preview source: ${error instanceof Error ? error.message : String(error)}`, 'manifest.json#/preview'))
    }
  }

  const themes = [
    { name: 'normal' as const, widgets: project.layout.normal.widgets },
    ...(project.layout.aod?.enabled ? [{ name: 'aod' as const, widgets: project.layout.aod.widgets }] : []),
  ]

  for (const theme of themes) {
    const ids = new Set<string>()
    const boundsByIndex: Array<WidgetBounds | undefined> = []
    for (const [index, widget] of theme.widgets.entries()) {
      const widgetPath = `layout.json#/${theme.name}/widgets/${index}`
      if (ids.has(widget.id)) issues.push(issue('error', 'DUPLICATE_WIDGET_ID', `Duplicate widget id "${widget.id}"`, `${widgetPath}/id`))
      ids.add(widget.id)

      if (widget.type === 'number') {
        const set = project.layout.assets.digitSets[widget.digitSet]
        if (!set) {
          issues.push(issue('error', 'DIGIT_SET_MISSING', `Unknown digit set "${widget.digitSet}"`, `${widgetPath}/digitSet`))
        } else {
          const sizes = [...set.digits, set.minus]
            .map((reference) => metadata.get(reference))
            .filter((value): value is ImageMetadata => Boolean(value))
            .map((value) => `${value.width}x${value.height}`)
          if (new Set(sizes).size > 1) issues.push(issue('error', 'DIGIT_SIZE_MISMATCH', `Digit set "${widget.digitSet}" contains inconsistent dimensions`, `${widgetPath}/digitSet`))
        }
      }

      if (widget.type === 'image-list' || widget.type === 'animation') {
        const paths = widget.type === 'image-list' ? widget.items.map((item) => item.asset) : widget.frames
        const sizes = paths.map((reference) => metadata.get(reference)).filter((value): value is ImageMetadata => Boolean(value)).map((value) => `${value.width}x${value.height}`)
        if (new Set(sizes).size > 1) issues.push(issue('error', 'SEQUENCE_SIZE_MISMATCH', `${widget.type} "${widget.id}" contains inconsistent frame dimensions`, widgetPath))
      }

      if (theme.name === 'aod' && widget.type === 'animation') {
        issues.push(issue('warning', 'AOD_ANIMATION', `Animation "${widget.id}" can cause severe AOD drain or be rejected`, widgetPath, 'Use a static AOD whenever possible.'))
      }
      if (widget.type === 'progress') {
        issues.push(issue('warning', 'PROGRESS_EXPERIMENTAL', `Progress widget "${widget.id}" uses a reverse-engineered property block`, widgetPath, 'Test this widget on expendable hardware before publishing.'))
      }

      const bounds = boundsForWidget(widget, project, metadata)
      boundsByIndex[index] = bounds
      if (bounds && (bounds.left < 0 || bounds.top < 0 || bounds.right > BAND10_DEVICE.width || bounds.bottom > BAND10_DEVICE.height)) {
        issues.push(issue('warning', 'WIDGET_CLIPPED', `Widget "${widget.id}" extends outside the 212×520 canvas`, widgetPath))
      }
    }

    for (let leftIndex = 0; leftIndex < theme.widgets.length; leftIndex += 1) {
      const leftWidget = theme.widgets[leftIndex]
      const leftBounds = boundsByIndex[leftIndex]
      if (!leftWidget || !leftBounds || leftWidget.visible === false || leftWidget.opacity === 0 || leftWidget.allowOverlap) continue
      for (let rightIndex = leftIndex + 1; rightIndex < theme.widgets.length; rightIndex += 1) {
        const rightWidget = theme.widgets[rightIndex]
        const rightBounds = boundsByIndex[rightIndex]
        if (!rightWidget || !rightBounds || rightWidget.visible === false || rightWidget.opacity === 0 || rightWidget.allowOverlap) continue
        const overlapWidth = Math.min(leftBounds.right, rightBounds.right) - Math.max(leftBounds.left, rightBounds.left)
        const overlapHeight = Math.min(leftBounds.bottom, rightBounds.bottom) - Math.max(leftBounds.top, rightBounds.top)
        if (overlapWidth > 0 && overlapHeight > 0) {
          issues.push(issue(
            'warning',
            'WIDGET_OVERLAP',
            `Widgets "${leftWidget.id}" and "${rightWidget.id}" overlap by ${Math.ceil(overlapWidth)}×${Math.ceil(overlapHeight)} px`,
            `layout.json#/${theme.name}/widgets`,
            'Move one widget or set allowOverlap only when the layering is intentional.',
          ))
        }
      }
    }
  }

  const estimatedBytes = [...metadata.values()].reduce((total, image) => total + (image.indexed ? image.width * image.height + 1024 : image.width * image.height * (image.hasAlpha ? 4 : 2)), 0)
  const transparentAssets = [...metadata.values()].filter((image) => image.hasAlpha).length
  if (transparentAssets > 20 && estimatedBytes > 5 * 1024 * 1024) {
    issues.push(issue('warning', 'MANY_ALPHA_ASSETS', `${transparentAssets} assets have alpha channels`, undefined, 'Opaque RGB assets are smaller and safer on constrained firmware.'))
  }
  if (estimatedBytes > 20 * 1024 * 1024) {
    issues.push(issue('error', 'STORAGE_ESTIMATE_EXCEEDED', `Uncompressed assets are approximately ${(estimatedBytes / 1024 / 1024).toFixed(1)} MiB`, undefined, 'Xiaomi documents roughly 20 MB total face storage on Band 10.'))
  }

  return {
    valid: !issues.some((entry) => entry.severity === 'error'),
    issues,
    stats: {
      widgets: themes.reduce((total, theme) => total + theme.widgets.length, 0),
      assets: uniqueReferences.length,
      estimatedBytes,
    },
  }
}

export async function validateProject(directory: string): Promise<ValidationReport> {
  try {
    return await validateLoadedProject(await loadProject(directory))
  } catch (error) {
    if (error instanceof ProjectLoadError) return { valid: false, issues: error.issues, stats: { widgets: 0, assets: 0 } }
    return {
      valid: false,
      issues: [issue('error', 'PROJECT_LOAD_FAILED', error instanceof Error ? error.message : String(error), path.resolve(directory))],
      stats: { widgets: 0, assets: 0 },
    }
  }
}