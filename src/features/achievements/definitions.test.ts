import { describe, expect, it } from 'vitest'

import es from '@/i18n/locales/es/achievements.json'
import { makeSession } from '@/test/fixtures'

import { ACHIEVEMENTS, achievementStats, countRecords, earnedAchievements } from './definitions'

const at = (date: string, hour = 18) =>
  new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime()
const session = (date: string, kg = 60, hour = 18, dayId = 'fullBodyA') => ({
  ...makeSession('barbell-squat', [{ kg, reps: 5 }], at(date, hour)),
  date,
  dayId,
  planId: `plan-${date}`,
})

const base = { plans: [], checkIns: 0, measurements: 0, weeklyTarget: 2, currentWeek: '2026-09-21' }

describe('logros', () => {
  it('todos tienen textos', () => {
    expect(Object.keys(es.items).sort()).toEqual(ACHIEVEMENTS.map((a) => a.id).sort())
  })

  it('sin historial no hay logros', () => {
    expect(earnedAchievements(achievementStats({ ...base, sessions: [] }))).toEqual([])
  })

  it('primera sesión y madrugador', () => {
    const sessions = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'].map(
      (d) => session(d, 60, 7),
    )
    const earned = earnedAchievements(achievementStats({ ...base, sessions }))
    expect(earned).toContain('firstSession')
    expect(earned).toContain('earlyBird')
    expect(earned).not.toContain('nightOwl')
  })

  it('cuenta récords solo cuando se supera la marca previa', () => {
    expect(countRecords([session('2026-09-01', 60), session('2026-09-03', 60)])).toBe(0)
    expect(
      countRecords([
        session('2026-09-01', 60),
        session('2026-09-03', 65),
        session('2026-09-05', 70),
      ]),
    ).toBe(2)
  })

  it('semana completa, descarga y vuelta tras un parón', () => {
    const sessions = [
      session('2026-08-03', 60, 18, 'fullBodyA'),
      session('2026-08-05', 60, 18, 'fullBodyB'),
      session('2026-09-01', 60, 18, 'fullBodyA'),
    ]
    const plans = [
      { id: 'x', weekStart: '2026-08-03', days: 2, deload: false },
      { id: 'plan-2026-09-01', weekStart: '2026-08-31', days: 2, deload: true },
    ]
    const stats = achievementStats({ ...base, sessions, plans })
    expect(stats.completeWeeks).toBe(1)
    expect(stats.deloadSessions).toBe(1)
    expect(stats.comebacks).toBe(1)
    expect(earnedAchievements(stats)).toEqual(
      expect.arrayContaining(['weekComplete', 'deload', 'comeback']),
    )
  })
})
