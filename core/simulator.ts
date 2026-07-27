import type { DataSourceKey, ImageListItem, SimulationState } from './types.ts'

export const DEFAULT_SIMULATION: SimulationState = {
  dateTime: '2026-07-14T10:08:00',
  battery: 82,
  steps: 7645,
  stepGoal: 10_000,
  heartRate: 68,
  heartRateZone: 3,
  weatherCondition: 0,
  temperatureC: 24,
  bluetooth: true,
  sleepStatus: false,
  screenLock: false,
  calories: 465,
  calorieGoal: 600,
  standCount: 8,
  stress: 31,
  sleepScore: 86,
}

function dateFromState(state: SimulationState): Date {
  const date = new Date(state.dateTime)
  return Number.isNaN(date.getTime()) ? new Date(DEFAULT_SIMULATION.dateTime) : date
}

export function getSourceValue(source: DataSourceKey, state: SimulationState): number {
  const date = dateFromState(state)
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  const day = date.getDate()

  switch (source) {
    case 'hour': return hour
    case 'hourLow': return hour % 10
    case 'hourHigh': return Math.floor(hour / 10)
    case 'minute': return minute
    case 'minuteLow': return minute % 10
    case 'minuteHigh': return Math.floor(minute / 10)
    case 'second': return second
    case 'secondLow': return second % 10
    case 'secondHigh': return Math.floor(second / 10)
    case 'day': return day
    case 'dayLow': return day % 10
    case 'dayHigh': return Math.floor(day / 10)
    case 'weekday': return date.getDay()
    case 'month': return date.getMonth() + 1
    case 'year': return date.getFullYear()
    case 'amPm': return hour >= 12 ? 1 : 0
    case 'weatherCondition': return state.weatherCondition
    case 'temperatureC': return state.temperatureC
    case 'temperatureF': return Math.round((state.temperatureC * 9) / 5 + 32)
    case 'battery': return state.battery
    case 'sleepStatus': return Number(state.sleepStatus)
    case 'bluetooth': return Number(state.bluetooth)
    case 'screenLock': return Number(state.screenLock)
    case 'heartRate': return state.heartRate
    case 'heartRateZone': return state.heartRateZone
    case 'steps': return state.steps
    case 'stepProgress': return Math.min(100, Math.round((state.steps / Math.max(1, state.stepGoal)) * 100))
    case 'calories': return state.calories
    case 'calorieProgress': return Math.min(100, Math.round((state.calories / Math.max(1, state.calorieGoal)) * 100))
    case 'standCount': return state.standCount
    case 'stress': return state.stress
    case 'sleepScore': return state.sleepScore
  }
}

export function formatNumberValue(value: number, digits: number, leadingZero: boolean): string {
  const negative = value < 0
  const absolute = String(Math.abs(Math.trunc(value)))
  const padded = leadingZero ? absolute.padStart(digits, '0') : absolute
  const clipped = padded.slice(-digits)
  return negative ? `-${clipped}` : clipped
}

export function selectImageListItem(
  items: ImageListItem[],
  value: number,
  fallback: 'floor' | 'nearest' | 'exact' = 'floor',
): ImageListItem | undefined {
  const ordered = [...items].sort((a, b) => a.value - b.value)
  const exact = ordered.find((item) => item.value === value)
  if (exact || fallback === 'exact') return exact
  if (fallback === 'nearest') {
    return ordered.reduce<ImageListItem | undefined>((best, item) => {
      if (!best) return item
      return Math.abs(item.value - value) < Math.abs(best.value - value) ? item : best
    }, undefined)
  }
  return [...ordered].reverse().find((item) => item.value <= value) ?? ordered[0]
}