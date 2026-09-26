import { describe, expect, it } from 'vitest'

import { hash, motivationContext, pickDaily, timeOfDay } from './messages'

const base = {
  calibration: false,
  deload: false,
  streakWeeks: 0,
  daysSinceLastSession: 2,
  lastSessionHadPR: false,
  weekDone: false,
  trainingToday: true,
}

describe('motivación', () => {
  it('elige el mismo mensaje todo el día y cambia entre días', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    expect(pickDaily(items, '2026-09-26', 'x')).toBe(pickDaily(items, '2026-09-26', 'x'))
    const week = ['20', '21', '22', '23', '24', '25', '26'].map((d) =>
      pickDaily(items, `2026-09-${d}`, 'x'),
    )
    expect(new Set(week).size).toBeGreaterThan(2)
    expect(hash('forja')).toBe(hash('forja'))
  })

  it('prioriza la vuelta tras un parón y la primera semana', () => {
    expect(motivationContext({ ...base, daysSinceLastSession: 14, calibration: true })).toBe(
      'comeback',
    )
    expect(motivationContext({ ...base, calibration: true })).toBe('firstWeek')
    expect(motivationContext({ ...base, weekDone: true, deload: true })).toBe('weekDone')
    expect(motivationContext({ ...base, deload: true })).toBe('deload')
    expect(motivationContext({ ...base, lastSessionHadPR: true })).toBe('pr')
    expect(motivationContext({ ...base, streakWeeks: 3 })).toBe('streak')
    expect(motivationContext({ ...base, trainingToday: false })).toBe('restDay')
  })

  it('saluda según la hora', () => {
    expect(timeOfDay(8)).toBe('morning')
    expect(timeOfDay(16)).toBe('afternoon')
    expect(timeOfDay(22)).toBe('evening')
    expect(timeOfDay(3)).toBe('night')
  })
})
