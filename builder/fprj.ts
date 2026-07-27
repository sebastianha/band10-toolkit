import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { BAND10_DEVICE, DATA_SOURCES, type LoadedProject, type WatchFaceTheme, type WatchFaceWidget } from '../core/index.ts'
import { copyStagedAssets, requireStagedAsset, type StagedAssetMap } from './assets.ts'

function xml(value: string | number): string {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function alpha(widget: WatchFaceWidget): number {
  return Math.round((widget.opacity ?? 1) * 255)
}

function dimensions(reference: string, assets: StagedAssetMap): { width: number; height: number } {
  const asset = requireStagedAsset(assets, reference)
  return { width: asset.width, height: asset.height }
}

function widgetXml(widget: WatchFaceWidget, project: LoadedProject, assets: StagedAssetMap): string[] {
  const common = `X="${widget.x}" Y="${widget.y}" Alpha="${alpha(widget)}" Visible_Src="0"`
  if (widget.type === 'image') {
    const asset = requireStagedAsset(assets, widget.asset)
    const suffix = asset.hasAlpha ? '_RGBA' : '_RGB'
    return [`    <Widget Shape="30" Name="${xml(widget.id + suffix)}" Bitmap="${xml(asset.fileName)}" ${common} Width="${asset.width}" Height="${asset.height}"/>`]
  }
  if (widget.type === 'number') {
    const set = project.layout.assets.digitSets[widget.digitSet]
    if (!set) throw new Error(`Unknown digit set: ${widget.digitSet}`)
    const files = [...set.digits, set.minus].map((reference) => requireStagedAsset(assets, reference).fileName)
    const size = dimensions(set.digits[0], assets)
    const align = { left: 0, center: 1, right: 2 }[widget.align]
    const rows = [`    <Widget Shape="32" Name="${xml(widget.id)}" BitmapList="${xml(files.join('|'))}" ${common} Width="${size.width}" Height="${size.height}" Digits="${widget.digits}" Alignment="${align}" Value_Src="${DATA_SOURCES[widget.source].fprjId}" Spacing="${widget.spacing ?? 0}" Blanking="${widget.leadingZero ? 0 : 1}"/>`]
    if (widget.unitAsset) {
      const unit = requireStagedAsset(assets, widget.unitAsset)
      rows.push(`    <Widget Shape="30" Name="${xml(`${widget.id}-unit_ref[${widget.id}]`)}" Bitmap="${xml(unit.fileName)}" X="0" Y="0" Width="${unit.width}" Height="${unit.height}" Alpha="${alpha(widget)}" Visible_Src="0"/>`)
    }
    return rows
  }
  if (widget.type === 'image-list') {
    const ordered = [...widget.items].sort((left, right) => left.value - right.value)
    const list = ordered.map((item) => `(${item.value}):${requireStagedAsset(assets, item.asset).fileName}`).join('|')
    const size = dimensions(ordered[0]?.asset ?? '', assets)
    return [`    <Widget Shape="31" Name="${xml(widget.id)}" BitmapList="${xml(list)}" ${common} Width="${size.width}" Height="${size.height}" Alignment="0" DefaultIndex="0" Value_Src="0" Spacing="0" Blanking="0" Index_Src="${DATA_SOURCES[widget.source].fprjId}"/>`]
  }
  if (widget.type === 'animation') {
    const list = widget.frames.map((reference, index) => `(${index}):${requireStagedAsset(assets, reference).fileName}`).join('|')
    const size = dimensions(widget.frames[0] ?? '', assets)
    return [`    <Widget Shape="31" Name="${xml(`anim_${widget.id}[${widget.repeat}@${widget.intervalMs}]`)}" BitmapList="${xml(list)}" ${common} Width="${size.width}" Height="${size.height}" Alignment="0" DefaultIndex="0" Value_Src="0" Spacing="0" Blanking="0" Index_Src="0"/>`]
  }
  const foreground = requireStagedAsset(assets, widget.foreground).fileName
  const background = widget.background ? requireStagedAsset(assets, widget.background).fileName : ''
  return [`    <Widget Shape="42" Name="${xml(widget.id)}" ${common} Width="${widget.width}" Height="${widget.height}" Rotate_xc="${Math.round(widget.width / 2)}" Rotate_yc="${Math.round(widget.height / 2)}" Radius="${Math.round(Math.min(widget.width, widget.height) / 2 - widget.thickness / 2)}" Line_Width="${widget.thickness}" Butt_cap_ending_style_En="0" StartAngle="${widget.startAngle ?? -120}" EndAngle="${widget.endAngle ?? 120}" Range_Min="0" Range_Max="${widget.maximum}" Range_MinStep="0" Range_Step="0" Background_ImageName="${xml(background)}" Foreground_ImageName="${xml(foreground)}" Range_Max_Src="0" Range_Val_Src="${DATA_SOURCES[widget.source].fprjId}"/>`]
}

function projectXml(project: LoadedProject, theme: WatchFaceTheme, assets: StagedAssetMap, title: string, preview: string): string {
  const widgets = [...theme.widgets].sort((left, right) => left.z - right.z).flatMap((widget) => widgetXml(widget, project, assets))
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<FaceProject DeviceType="${BAND10_DEVICE.fprjDeviceType}" Id="${xml(project.manifest.id)}">`,
    `  <Screen Title="${xml(title)}" Bitmap="${xml(preview)}">`,
    ...widgets,
    '  </Screen>',
    '</FaceProject>',
    '',
  ].join('\n')
}

export async function writeFprjIntermediate(
  project: LoadedProject,
  normalAssets: StagedAssetMap,
  aodAssets: StagedAssetMap,
  outputDirectory: string,
  previewPath: string,
): Promise<string> {
  const imagesDirectory = path.join(outputDirectory, 'images')
  await mkdir(imagesDirectory, { recursive: true })
  await copyStagedAssets(normalAssets, imagesDirectory)
  await copyFile(previewPath, path.join(imagesDirectory, 'preview.png'))
  const projectName = `${project.manifest.output}.fprj`
  const projectPath = path.join(outputDirectory, projectName)
  await writeFile(projectPath, projectXml(project, project.layout.normal, normalAssets, project.manifest.name, 'preview.png'))

  if (project.layout.aod?.enabled) {
    const aodDirectory = path.join(outputDirectory, 'AOD')
    const aodImages = path.join(aodDirectory, 'images')
    await mkdir(aodImages, { recursive: true })
    await copyStagedAssets(aodAssets, aodImages)
    await writeFile(path.join(aodDirectory, 'AOD.fprj'), projectXml(project, project.layout.aod, aodAssets, `${project.manifest.name} AOD`, ''))
  }
  return projectPath
}