import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DATA_SOURCES, type LoadedProject, type WatchFaceWidget } from '../core/index.ts'
import { copyStagedAssets, requireStagedAsset, type StagedAssetMap } from './assets.ts'

function withoutExtension(fileName: string): string {
  return fileName.replace(/\.png$/i, '')
}

function imageName(assets: StagedAssetMap, reference: string): string {
  return withoutExtension(requireStagedAsset(assets, reference).fileName)
}

function gmfElement(widget: WatchFaceWidget, project: LoadedProject, assets: StagedAssetMap): Record<string, unknown> {
  if (widget.type === 'image') {
    return { type: 'element', x: widget.x, y: widget.y, image: imageName(assets, widget.asset) }
  }
  if (widget.type === 'number') {
    const set = project.layout.assets.digitSets[widget.digitSet]
    if (!set) throw new Error(`Unknown digit set: ${widget.digitSet}`)
    const element: Record<string, unknown> = {
      type: 'widge_dignum',
      x: widget.x,
      y: widget.y,
      showCount: widget.digits,
      align: { right: 0, left: 1, center: 2 }[widget.align],
      spacing: widget.spacing ?? 0,
      showZero: widget.leadingZero ?? false,
      dataSrc: DATA_SOURCES[widget.source].fprjId,
      imageList: [...set.digits, set.minus].map((reference) => imageName(assets, reference)),
    }
    if (widget.unitAsset) element.image = imageName(assets, widget.unitAsset)
    return element
  }
  if (widget.type === 'image-list') {
    const ordered = [...widget.items].sort((left, right) => left.value - right.value)
    return {
      type: 'widge_imagelist',
      x: widget.x,
      y: widget.y,
      dataSrc: DATA_SOURCES[widget.source].fprjId,
      imageList: ordered.map((item) => imageName(assets, item.asset)),
      imageIndexList: ordered.map((item) => item.value),
    }
  }
  if (widget.type === 'animation') {
    return {
      type: 'element_anim',
      x: widget.x,
      y: widget.y,
      imageList: widget.frames.map((reference) => imageName(assets, reference)),
      animInterval: widget.intervalMs,
      animRepeat: widget.repeat,
    }
  }
  return {
    type: 'widge_process',
    x: widget.x,
    y: widget.y,
    dataSrc: DATA_SOURCES[widget.source].fprjId,
    image: imageName(assets, widget.foreground),
    maximum: widget.maximum,
  }
}

export async function writeGmfIntermediate(
  project: LoadedProject,
  normalAssets: StagedAssetMap,
  aodAssets: StagedAssetMap,
  outputDirectory: string,
  previewPath: string,
): Promise<string> {
  const imagesDirectory = path.join(outputDirectory, 'images')
  const aodImagesDirectory = path.join(outputDirectory, 'images_aod')
  await Promise.all([mkdir(imagesDirectory, { recursive: true }), mkdir(aodImagesDirectory, { recursive: true })])
  await Promise.all([
    copyStagedAssets(normalAssets, imagesDirectory),
    copyStagedAssets(aodAssets, aodImagesDirectory),
    copyFile(previewPath, path.join(imagesDirectory, 'preview.png')),
  ])
  const definition = {
    name: project.manifest.name,
    id: project.manifest.id,
    deviceType: 'xiaomi_band_10',
    previewImg: 'preview',
    forceIndex256: false,
    elementsNormal: [...project.layout.normal.widgets]
      .filter((widget) => widget.visible !== false)
      .sort((left, right) => left.z - right.z)
      .map((widget) => gmfElement(widget, project, normalAssets)),
    elementsAod: project.layout.aod?.enabled
      ? [...project.layout.aod.widgets]
          .filter((widget) => widget.visible !== false)
          .sort((left, right) => left.z - right.z)
          .map((widget) => gmfElement(widget, project, aodAssets))
      : [],
  }
  const outputPath = path.join(outputDirectory, 'wfDef.json')
  await writeFile(outputPath, `${JSON.stringify(definition, null, 2)}\n`)
  return outputPath
}