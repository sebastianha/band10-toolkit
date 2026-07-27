export const BAND10_DEVICE = {
  model: 'xiaomi-smart-band-10',
  displayName: 'Xiaomi Smart Band 10',
  codename: 'o66',
  packageId: 'miwear.watch.o66',
  fprjDeviceType: 466,
  width: 212,
  height: 520,
  cornerRadius: 106,
  binaryMagic: '5aa53412',
} as const

export type CompilerTarget = 'native' | 'mi-create' | 'mi8-tool'

export interface WatchFaceManifest {
  $schema?: string
  formatVersion: 1
  id: string
  name: string
  author: string
  version: string
  description?: string
  license?: string
  device: typeof BAND10_DEVICE.model
  preview: string
  output: string
  compiler: {
    target: CompilerTarget
    imageCompression: boolean
  }
}

export type DataSourceKey =
  | 'hour'
  | 'hourLow'
  | 'hourHigh'
  | 'minute'
  | 'minuteLow'
  | 'minuteHigh'
  | 'second'
  | 'secondLow'
  | 'secondHigh'
  | 'day'
  | 'dayLow'
  | 'dayHigh'
  | 'weekday'
  | 'month'
  | 'year'
  | 'amPm'
  | 'weatherCondition'
  | 'temperatureC'
  | 'temperatureF'
  | 'battery'
  | 'sleepStatus'
  | 'bluetooth'
  | 'screenLock'
  | 'heartRate'
  | 'heartRateZone'
  | 'steps'
  | 'stepProgress'
  | 'calories'
  | 'calorieProgress'
  | 'standCount'
  | 'stress'
  | 'sleepScore'

export type WidgetType = 'image' | 'number' | 'image-list' | 'progress' | 'animation'

export interface BaseWidget {
  id: string
  type: WidgetType
  x: number
  y: number
  z: number
  opacity?: number
  visible?: boolean
  locked?: boolean
  allowOverlap?: boolean
  label?: string
}

export interface ImageWidget extends BaseWidget {
  type: 'image'
  asset: string
}

export interface NumberWidget extends BaseWidget {
  type: 'number'
  source: DataSourceKey
  digitSet: string
  digits: number
  align: 'left' | 'center' | 'right'
  spacing?: number
  leadingZero?: boolean
  unitAsset?: string
}

export interface ImageListItem {
  value: number
  asset: string
  label?: string
}

export interface ImageListWidget extends BaseWidget {
  type: 'image-list'
  source: DataSourceKey
  items: ImageListItem[]
  fallback?: 'floor' | 'nearest' | 'exact'
}

export interface ProgressWidget extends BaseWidget {
  type: 'progress'
  source: DataSourceKey
  maximum: number
  shape: 'bar' | 'arc'
  width: number
  height: number
  thickness: number
  startAngle?: number
  endAngle?: number
  foreground: string
  background?: string
}

export interface AnimationWidget extends BaseWidget {
  type: 'animation'
  frames: string[]
  intervalMs: number
  repeat: number
}

export type WatchFaceWidget =
  | ImageWidget
  | NumberWidget
  | ImageListWidget
  | ProgressWidget
  | AnimationWidget

export interface DigitSet {
  digits: [string, string, string, string, string, string, string, string, string, string]
  minus: string
}

export interface WatchFaceTheme {
  background: string
  widgets: WatchFaceWidget[]
}

export interface WatchFaceLayout {
  $schema?: string
  formatVersion: 1
  canvas: {
    width: number
    height: number
    clip: 'pill' | 'rectangle'
  }
  assets: {
    digitSets: Record<string, DigitSet>
  }
  normal: WatchFaceTheme
  aod?: WatchFaceTheme & {
    enabled: boolean
  }
}

export interface LoadedProject {
  directory: string
  manifest: WatchFaceManifest
  layout: WatchFaceLayout
}

export interface SimulationState {
  dateTime: string
  battery: number
  steps: number
  stepGoal: number
  heartRate: number
  heartRateZone: number
  weatherCondition: number
  temperatureC: number
  bluetooth: boolean
  sleepStatus: boolean
  screenLock: boolean
  calories: number
  calorieGoal: number
  standCount: number
  stress: number
  sleepScore: number
}

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  severity: ValidationSeverity
  code: string
  message: string
  path?: string
  hint?: string
}

export interface ValidationReport {
  valid: boolean
  issues: ValidationIssue[]
  stats: {
    widgets: number
    assets: number
    estimatedBytes?: number
  }
}