import { BAND10_DEVICE, DATA_SOURCES } from '../core/index.ts'
import { assertRange, readI16LE, readNullTerminated, readU16LE, readU24LE, readU32LE, toHex } from './bytes.ts'

export const MAIN_HEADER_SIZE = 0xa8
export const FACE_HEADER_SIZE = 0x58
export const NAMED_FACE_BLOCK_SIZE = 0x48
export const DEFINITION_SIZE = 16

export type DefinitionType = 0 | 2 | 3 | 4 | 5 | 7 | 8 | 9

export interface WatchFaceHeader {
  magic: string
  deviceFlags: number
  faceCount: number
  styleCount: number
  previewOffset: number
  id: string
  name: string
  namedFaces: boolean
  fileSize: number
}

export interface SectionPointer {
  count: number
  offset: number
}

export interface FaceHeader {
  index: number
  offset: number
  previewOffset: number
  name?: string
  sections: Record<DefinitionType, SectionPointer>
}

export interface Definition {
  index: number
  type: DefinitionType
  offset: number
  length: number
}

export interface ParsedElement {
  index: number
  x: number
  y: number
  referenceType: number
  referenceIndex: number
  kind: string
  dataSource?: string
  dataSourceName?: string
  details?: Record<string, unknown>
}

export interface ParsedFace {
  header: FaceHeader
  definitions: Definition[]
  elements: ParsedElement[]
}

export interface WatchFaceInspection {
  header: WatchFaceHeader
  faces: ParsedFace[]
  warnings: string[]
}

const SECTION_TYPES: DefinitionType[] = [0, 2, 3, 4, 5, 7, 8, 9]
const SECTION_HEADER_OFFSETS: Record<DefinitionType, number> = {
  0: 0x08,
  2: 0x18,
  3: 0x20,
  4: 0x28,
  5: 0x30,
  7: 0x40,
  8: 0x48,
  9: 0x50,
}

const sourceById = new Map(Object.values(DATA_SOURCES).map((source) => [source.fprjId.toUpperCase(), source.key]))

function detectNamedFaces(buffer: Uint8Array, faceCount: number): boolean {
  const firstDefinitionOffset = readU32LE(buffer, MAIN_HEADER_SIZE + 0x0c)
  const legacyHeadersEnd = MAIN_HEADER_SIZE + faceCount * FACE_HEADER_SIZE
  const namedHeadersEnd = MAIN_HEADER_SIZE + faceCount * (FACE_HEADER_SIZE + NAMED_FACE_BLOCK_SIZE)
  return faceCount > 0 && namedHeadersEnd <= buffer.length && firstDefinitionOffset >= namedHeadersEnd && firstDefinitionOffset > legacyHeadersEnd
}

function faceOffset(index: number, namedFaces: boolean): number {
  return MAIN_HEADER_SIZE + index * (FACE_HEADER_SIZE + (namedFaces ? NAMED_FACE_BLOCK_SIZE : 0))
}

function parseFaceHeader(buffer: Uint8Array, index: number, namedFaces: boolean): FaceHeader {
  const offset = faceOffset(index, namedFaces)
  assertRange(buffer, offset, FACE_HEADER_SIZE, `face ${index} header`)
  const sections = {} as Record<DefinitionType, SectionPointer>
  for (const type of SECTION_TYPES) {
    const sectionOffset = SECTION_HEADER_OFFSETS[type]
    sections[type] = {
      count: readU32LE(buffer, offset + sectionOffset),
      offset: readU32LE(buffer, offset + sectionOffset + 4),
    }
  }
  const name = namedFaces ? readNullTerminated(buffer, offset + FACE_HEADER_SIZE, 0x40) : undefined
  return { index, offset, previewOffset: readU32LE(buffer, offset + 4), name: name || undefined, sections }
}

function parseDefinitions(buffer: Uint8Array, face: FaceHeader, warnings: string[]): Definition[] {
  const definitions: Definition[] = []
  for (const type of SECTION_TYPES) {
    const section = face.sections[type]
    if (section.count === 0) continue
    const sectionLength = section.count * DEFINITION_SIZE
    if (section.offset + sectionLength > buffer.length) {
      warnings.push(`Face ${face.index} type-${type} definition table points outside the file`)
      continue
    }
    for (let item = 0; item < section.count; item += 1) {
      const offset = section.offset + item * DEFINITION_SIZE
      const declaredType = buffer[offset + 3] as DefinitionType
      definitions.push({
        index: readU16LE(buffer, offset),
        type: declaredType,
        offset: readU32LE(buffer, offset + 8),
        length: readU32LE(buffer, offset + 12),
      })
      if (declaredType !== type) warnings.push(`Face ${face.index} section ${type} contains a type-${declaredType} definition`)
    }
  }
  return definitions
}

function sourceIdAt(buffer: Uint8Array, offset: number): string {
  const bytes = buffer.subarray(offset, offset + 3)
  const short = toHex(bytes.subarray(0, 2)).toUpperCase()
  const extended = toHex(bytes).toUpperCase()
  if (sourceById.has(short) || bytes[2] === 0) return short
  return extended
}

function parseWidget(buffer: Uint8Array, definition: Definition): Pick<ParsedElement, 'kind' | 'dataSource' | 'dataSourceName' | 'details'> {
  assertRange(buffer, definition.offset, Math.min(definition.length, 4), 'widget property')
  const widgetType = (buffer[definition.offset + 3] ?? 0) & 0xf0
  const dataSource = sourceIdAt(buffer, definition.offset)
  const dataSourceName = sourceById.get(dataSource)

  if (widgetType === 0x10) {
    return {
      kind: 'number',
      dataSource,
      dataSourceName,
      details: {
        digits: buffer[definition.offset + 2] ?? 1,
        align: (buffer[definition.offset + 3] ?? 0) & 0x03,
        leadingZero: (((buffer[definition.offset + 3] ?? 0) >>> 2) & 1) === 1,
        imageListIndex: definition.length >= 12 ? readU24LE(buffer, definition.offset + 8) : undefined,
      },
    }
  }
  if (widgetType === 0x20) {
    return {
      kind: 'image-list',
      dataSource,
      dataSourceName,
      details: {
        imageListIndex: definition.length >= 12 ? readU24LE(buffer, definition.offset + 8) : undefined,
        mappedValues: Math.max(0, Math.floor((definition.length - 16) / 4)),
      },
    }
  }
  if (widgetType === 0x30) return { kind: 'pointer', dataSource, dataSourceName }
  if (widgetType === 0x40) return { kind: 'progress', dataSource, dataSourceName }
  return { kind: `unknown-widget-0x${widgetType.toString(16)}`, dataSource, dataSourceName }
}

function parseElements(buffer: Uint8Array, definitions: Definition[], warnings: string[]): ParsedElement[] {
  const baseDefinitions = definitions.filter((definition) => definition.type === 0)
  const byTypeAndIndex = new Map(definitions.map((definition) => [`${definition.type}:${definition.index}`, definition]))
  return baseDefinitions.flatMap((definition, index) => {
    if (definition.offset + 8 > buffer.length) {
      warnings.push(`Element ${index} points outside the file`)
      return []
    }
    const referenceIndex = readU24LE(buffer, definition.offset)
    const referenceType = buffer[definition.offset + 3] ?? 0
    const referenced = byTypeAndIndex.get(`${referenceType}:${referenceIndex}`)
    const base: ParsedElement = {
      index,
      x: readI16LE(buffer, definition.offset + 4),
      y: readI16LE(buffer, definition.offset + 6),
      referenceType,
      referenceIndex,
      kind: referenceType === 2 ? 'image' : referenceType === 4 ? 'animation' : `type-${referenceType}`,
    }
    if (referenceType === 7 && referenced) return [{ ...base, ...parseWidget(buffer, referenced) }]
    if (referenceType === 4 && referenced && referenced.offset + 10 <= buffer.length) {
      return [{
        ...base,
        kind: 'animation',
        details: {
          imageListIndex: readU24LE(buffer, referenced.offset),
          intervalMs: readU16LE(buffer, referenced.offset + 6),
          repeat: readU16LE(buffer, referenced.offset + 8),
        },
      }]
    }
    return [base]
  })
}

export function inspectWatchFace(buffer: Uint8Array): WatchFaceInspection {
  assertRange(buffer, 0, MAIN_HEADER_SIZE + FACE_HEADER_SIZE, 'watch-face header')
  const magic = toHex(buffer.subarray(0, 4))
  if (magic !== BAND10_DEVICE.binaryMagic) {
    throw new Error(`Unexpected magic ${magic}; expected ${BAND10_DEVICE.binaryMagic}`)
  }
  const faceCount = Math.max(1, readU16LE(buffer, 0x1c))
  const namedFaces = detectNamedFaces(buffer, faceCount)
  const header: WatchFaceHeader = {
    magic,
    deviceFlags: readU32LE(buffer, 0x10),
    faceCount,
    styleCount: readU16LE(buffer, 0x1e),
    previewOffset: readU32LE(buffer, 0x20),
    id: readNullTerminated(buffer, 0x28, 9),
    name: readNullTerminated(buffer, 0x68, 60),
    namedFaces,
    fileSize: buffer.length,
  }
  const warnings: string[] = []
  if (header.deviceFlags !== 0x800) warnings.push(`Unexpected o66 device flags 0x${header.deviceFlags.toString(16)} (commonly 0x800)`)
  if (header.previewOffset >= buffer.length) warnings.push('Top-level preview offset points outside the file')

  const faces: ParsedFace[] = []
  for (let index = 0; index < faceCount; index += 1) {
    try {
      const faceHeader = parseFaceHeader(buffer, index, namedFaces)
      const definitions = parseDefinitions(buffer, faceHeader, warnings)
      faces.push({ header: faceHeader, definitions, elements: parseElements(buffer, definitions, warnings) })
    } catch (error) {
      warnings.push(`Could not parse face ${index}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return { header, faces, warnings }
}