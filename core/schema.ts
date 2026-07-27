import { z } from 'zod'
import { BAND10_DEVICE } from './types.ts'

const integer = z.number().int()
const coordinate = integer.min(-999).max(999)
const opacity = z.number().min(0).max(1).optional()
const dataSource = z.enum([
  'hour', 'hourLow', 'hourHigh', 'minute', 'minuteLow', 'minuteHigh',
  'second', 'secondLow', 'secondHigh', 'day', 'dayLow', 'dayHigh',
  'weekday', 'month', 'year', 'amPm', 'weatherCondition', 'temperatureC',
  'temperatureF', 'battery', 'sleepStatus', 'bluetooth', 'screenLock',
  'heartRate', 'heartRateZone', 'steps', 'stepProgress', 'calories',
  'calorieProgress', 'standCount', 'stress', 'sleepScore',
])

const baseWidget = z.object({
  id: z.string().min(1).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/),
  x: coordinate,
  y: coordinate,
  z: integer.min(0),
  opacity,
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  allowOverlap: z.boolean().optional(),
  label: z.string().optional(),
})

const imageWidget = baseWidget.extend({
  type: z.literal('image'),
  asset: z.string().min(1),
}).strict()

const numberWidget = baseWidget.extend({
  type: z.literal('number'),
  source: dataSource,
  digitSet: z.string().min(1),
  digits: integer.min(1).max(40),
  align: z.enum(['left', 'center', 'right']),
  spacing: integer.min(-999).max(999).optional(),
  leadingZero: z.boolean().optional(),
  unitAsset: z.string().min(1).optional(),
}).strict()

const imageListWidget = baseWidget.extend({
  type: z.literal('image-list'),
  source: dataSource,
  items: z.array(z.object({
    value: integer,
    asset: z.string().min(1),
    label: z.string().optional(),
  }).strict()).min(1),
  fallback: z.enum(['floor', 'nearest', 'exact']).optional(),
}).strict()

const progressWidget = baseWidget.extend({
  type: z.literal('progress'),
  source: dataSource,
  maximum: z.number().positive(),
  shape: z.enum(['bar', 'arc']),
  width: integer.positive().max(BAND10_DEVICE.width),
  height: integer.positive().max(BAND10_DEVICE.height),
  thickness: integer.positive(),
  startAngle: z.number().min(-360).max(360).optional(),
  endAngle: z.number().min(-360).max(360).optional(),
  foreground: z.string().min(1),
  background: z.string().min(1).optional(),
}).strict()

const animationWidget = baseWidget.extend({
  type: z.literal('animation'),
  frames: z.array(z.string().min(1)).min(2),
  intervalMs: integer.min(16).max(60_000),
  repeat: integer.min(0).max(65_535),
}).strict()

export const widgetSchema = z.discriminatedUnion('type', [
  imageWidget,
  numberWidget,
  imageListWidget,
  progressWidget,
  animationWidget,
])

const themeSchema = z.object({
  background: z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/),
  widgets: z.array(widgetSchema),
}).strict()

export const manifestSchema = z.object({
  $schema: z.string().optional(),
  formatVersion: z.literal(1),
  id: z.string().regex(/^\d{9}$/, 'Band 10 IDs must contain exactly 9 digits'),
  name: z.string().min(1).max(60),
  author: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  license: z.string().optional(),
  device: z.literal(BAND10_DEVICE.model),
  preview: z.string().min(1),
  output: z.string().min(1),
  compiler: z.object({
    target: z.enum(['native', 'mi-create', 'mi8-tool']),
    imageCompression: z.boolean(),
  }).strict(),
}).strict()

const digitSetSchema = z.object({
  digits: z.tuple([
    z.string(), z.string(), z.string(), z.string(), z.string(),
    z.string(), z.string(), z.string(), z.string(), z.string(),
  ]),
  minus: z.string(),
}).strict()

export const layoutSchema = z.object({
  $schema: z.string().optional(),
  formatVersion: z.literal(1),
  canvas: z.object({
    width: z.literal(BAND10_DEVICE.width),
    height: z.literal(BAND10_DEVICE.height),
    clip: z.enum(['pill', 'rectangle']),
  }).strict(),
  assets: z.object({
    digitSets: z.record(z.string(), digitSetSchema),
  }).strict(),
  normal: themeSchema,
  aod: themeSchema.extend({ enabled: z.boolean() }).optional(),
}).strict()

export type ManifestInput = z.input<typeof manifestSchema>
export type LayoutInput = z.input<typeof layoutSchema>