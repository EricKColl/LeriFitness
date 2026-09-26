import { describe, expect, it } from 'vitest'

import { CATALOG, makeSession } from '@/test/fixtures'

import {
  e1rmSeries,
  heatLevel,
  muscleSets,
  sessionRecords,
  sessionTonnage,
  streakWeeks,
  weeklySummary,
} from './stats'

const byId = new Map(CATALOG.map((e) => [e.id, e]))
const at = (date: string) => new Date(`${date}T18:00:00`).getTime()
const session = (date: string, sets = [{ kg: 60, reps: 8 }], id = 'barbell-squat') => ({
  ...makeSession(id, sets, at(date)),
  date,
})

describe('estadísticas', () => {
  it('calcula el tonelaje con carga externa', () => {
    expect(
      sessionTonnage(
        session('2026-09-21', [
          { kg: 60, reps: 8 },
          { kg: 70, reps: 5 },
        ]),
      ),
    ).toBe(830)
  })

  it('cuenta la racha semanal (al menos 2 días o el objetivo si es menor)', () => {
    const sessions = [
      session('2026-09-01'),
      session('2026-09-03'),
      session('2026-09-08'),
      session('2026-09-10'),
      session('2026-09-15'),
      session('2026-09-17'),
      session('2026-09-22'),
    ]
    // Semana actual (21/09) aún sin cumplir: no rompe la racha.
    expect(streakWeeks(sessions, 3, '2026-09-21')).toBe(3)
    expect(streakWeeks([...sessions, session('2026-09-24')], 3, '2026-09-21')).toBe(4)
    expect(streakWeeks(sessions, 1, '2026-09-21')).toBe(4)
    expect(streakWeeks([], 3, '2026-09-21')).toBe(0)
  })

  it('detecta récords personales frente al historial', () => {
    const a = session('2026-09-01', [{ kg: 80, reps: 5 }])
    const b = session('2026-09-08', [{ kg: 85, reps: 5 }])
    const c = session('2026-09-15', [{ kg: 80, reps: 5 }])
    expect(sessionRecords(a, [a, b, c])).toEqual([])
    expect(sessionRecords(b, [a, b, c]).map((r) => r.exerciseId)).toEqual(['barbell-squat'])
    expect(sessionRecords(c, [a, b, c])).toEqual([])
    expect(e1rmSeries([c, a, b], 'barbell-squat').map((p) => p.date)).toEqual([
      '2026-09-01',
      '2026-09-08',
      '2026-09-15',
    ])
  })

  it('reparte las series por músculo con conteo fraccional', () => {
    const sets = muscleSets(
      [
        session('2026-09-21', [
          { kg: 60, reps: 8 },
          { kg: 60, reps: 8 },
        ]),
      ],
      byId,
    )
    expect(sets.quads).toBe(2)
    expect(sets.glutes).toBe(1)
    expect(sets.chest).toBe(0)
  })

  it('escala de calor del mapa muscular', () => {
    const range = { min: 10, max: 16 }
    expect(heatLevel(0, range)).toBe(0)
    expect(heatLevel(2, range)).toBe(1)
    expect(heatLevel(5, range)).toBe(2)
    expect(heatLevel(9, range)).toBe(3)
    expect(heatLevel(12, range)).toBe(4)
    expect(heatLevel(20, range)).toBe(5)
  })

  it('resume las últimas semanas', () => {
    const summary = weeklySummary([session('2026-09-15'), session('2026-09-22')], '2026-09-21', 3)
    expect(summary.map((w) => w.sessions)).toEqual([0, 1, 1])
    expect(summary[2]?.tonnage).toBe(480)
  })
})
