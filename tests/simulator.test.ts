import { describe, expect, it } from 'vitest'
import { DEFAULT_SIMULATION, formatNumberValue, getSourceValue, selectImageListItem } from '../core/simulator.ts'

describe('watch-face simulator', () => {
  it('derives date/time source values', () => {
    const state = { ...DEFAULT_SIMULATION, dateTime: '2026-07-14T23:08:59' }
    expect(getSourceValue('hour', state)).toBe(23)
    expect(getSourceValue('hourHigh', state)).toBe(2)
    expect(getSourceValue('minuteLow', state)).toBe(8)
    expect(getSourceValue('second', state)).toBe(59)
    expect(getSourceValue('year', state)).toBe(2026)
    expect(getSourceValue('month', state)).toBe(7)
    expect(getSourceValue('day', state)).toBe(14)
    expect(getSourceValue('amPm', state)).toBe(1)
  })

  it('calculates bounded goal percentages', () => {
    expect(getSourceValue('stepProgress', { ...DEFAULT_SIMULATION, steps: 15_000, stepGoal: 10_000 })).toBe(100)
    expect(getSourceValue('calorieProgress', { ...DEFAULT_SIMULATION, calories: 300, calorieGoal: 600 })).toBe(50)
  })

  it('formats sprite numbers', () => {
    expect(formatNumberValue(8, 2, true)).toBe('08')
    expect(formatNumberValue(1234, 3, false)).toBe('234')
    expect(formatNumberValue(-6, 2, false)).toBe('-6')
  })

  it('implements floor, nearest, and exact image-list selection', () => {
    const items = [
      { value: 0, asset: 'zero' },
      { value: 50, asset: 'half' },
      { value: 100, asset: 'full' },
    ]
    expect(selectImageListItem(items, 99, 'floor')?.asset).toBe('half')
    expect(selectImageListItem(items, 76, 'nearest')?.asset).toBe('full')
    expect(selectImageListItem(items, 76, 'exact')).toBeUndefined()
  })
})