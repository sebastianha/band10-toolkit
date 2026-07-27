import { createHash } from 'node:crypto'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { collectAssetReferences, type LoadedProject } from '../core/index.ts'
import { resolveProjectAsset } from './project.ts'

export interface StagedAsset {
  reference: string
  sourcePath: string
  outputPath: string
  fileName: string
  width: number
  height: number
  hasAlpha: boolean
  bytes: number
  dominantColor: string
}

export type StagedAssetMap = Map<string, StagedAsset>

function safeStem(reference: string): string {
  const stem = path.basename(reference, path.extname(reference)).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  return (stem || 'asset').slice(0, 40)
}

function stagedName(reference: string): string {
  const hash = createHash('sha256').update(reference).digest('hex').slice(0, 10)
  return `${safeStem(reference)}-${hash}.png`
}

function rgbHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

export async function stageThemeAssets(
  project: LoadedProject,
  theme: 'normal' | 'aod',
  outputDirectory: string,
): Promise<StagedAssetMap> {
  await mkdir(outputDirectory, { recursive: true })
  const references = collectAssetReferences(project.layout).filter((reference) => reference.theme === theme)
  const uniqueReferences = [...new Set(references.map((reference) => reference.path))].sort()
  const staged: StagedAssetMap = new Map()

  for (const reference of uniqueReferences) {
    const sourcePath = resolveProjectAsset(project, reference)
    const sourceStat = await stat(sourcePath).catch(() => undefined)
    if (!sourceStat?.isFile()) throw new Error(`Missing asset: ${reference}`)
    const fileName = stagedName(reference)
    const outputPath = path.join(outputDirectory, fileName)
    const pipeline = sharp(sourcePath, { density: 72 }).ensureAlpha().png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })
    await sharp(data).toFile(outputPath)
    const metadata = await sharp(data).metadata()
    const statistics = await sharp(data).stats()
    const outputStat = await stat(outputPath)
    staged.set(reference, {
      reference,
      sourcePath,
      outputPath,
      fileName,
      width: info.width,
      height: info.height,
      hasAlpha: metadata.hasAlpha ?? false,
      bytes: outputStat.size,
      dominantColor: rgbHex(statistics.dominant.r, statistics.dominant.g, statistics.dominant.b),
    })
  }
  return staged
}

export async function copyStagedAssets(assets: StagedAssetMap, outputDirectory: string): Promise<void> {
  await mkdir(outputDirectory, { recursive: true })
  await Promise.all([...assets.values()].map((asset) => copyFile(asset.outputPath, path.join(outputDirectory, asset.fileName))))
}

export function requireStagedAsset(assets: StagedAssetMap, reference: string): StagedAsset {
  const asset = assets.get(reference)
  if (!asset) throw new Error(`Asset was not staged: ${reference}`)
  return asset
}