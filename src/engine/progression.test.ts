import { describe, expect, it } from 'vitest'

import { makeSession } from '@/test/fixtures'

import {
  estimate1RM,
  isDeclining,
  isLoadable,
  loadFor1RM,
  loadIncrement,
  roundLoad,
  suggestLoad,
} from './progression'

const barbell = {
  id: 'barbell-bench-press-medium-grip',
  equipment: ['barbell', 'bench', 'rack'] as const,
}
const dumbbell = { id: 'dumbbell-bench-press', equipment: ['bench', 'dumbbell'] as const }
const pushups = { id: 'pushups', equipment: ['bodyweight'] as const }
const hypertrophy = { reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 } }
const DAY = 86_400_000
const t0 = Date.UTC(2026, 8, 1)

describe('e1RM (Epley corregido por RIR)', () => {
  it('estima el máximo y la carga para unas repeticiones objetivo', () => {
    expect(estimate1RM(100, 5, 0)).toBeCloseTo(116.67, 1)
    // 5 repeticiones con 2 en reserva equivalen a 7 al fallo
    expect(estimate1RM(100, 5, 2)).toBeCloseTo(estimate1RM(100, 7, 0))
    const e1rm = estimate1RM(80, 8, 2)
    expect(loadFor1RM(e1rm, 8, 2)).toBeCloseTo(80)
    expect(loadFor1RM(e1rm, 5, 2)).toBeGreaterThan(80)
  })
})

describe('carga por material', () => {
  it('usa el incremento mínimo de cada material', () => {
    expect(loadIncrement(['barbell'])).toBe(2.5)
    expect(loadIncrement(['dumbbell'])).toBe(2)
    expect(loadIncrement(['kettlebell'])).toBe(4)
    expect(loadIncrement(['machine'])).toBe(2.5)
    expect(loadIncrement(['bodyweight'])).toBe(0)
  })

  it('redondea al material y no baja de la barra vacía', () => {
    expect(roundLoad(61.3, ['barbell'])).toBe(62.5)
    expect(roundLoad(61.2, ['barbell'])).toBe(60)
    expect(roundLoad(12, ['barbell'])).toBe(20)
    expect(roundLoad(13.1, ['dumbbell'])).toBe(14)
  })

  it('distingue los movimientos con el propio cuerpo', () => {
    expect(isLoadable(pushups)).toBe(false)
    expect(isLoadable({ id: 'inverted-row', equipment: ['barbell', 'rack'] })).toBe(false)
    expect(isLoadable({ id: 'dip-machine', equipment: ['machine'] })).toBe(true)
    expect(isLoadable(barbell)).toBe(true)
  })
})

describe('doble progresión', () => {
  it('sin historial: semana de calibración', () => {
    const s = suggestLoad(barbell, hypertrophy.reps, hypertrophy.rir, [])
    expect(s).toEqual({ kg: null, note: { key: 'load.calibrate' } })
    expect(suggestLoad(pushups, hypertrophy.reps, hypertrophy.rir, []).note.key).toBe(
      'load.bodyweightStart',
    )
  })

  it('todas las series en el tope con el esfuerzo objetivo: sube carga', () => {
    const history = [
      makeSession(
        barbell.id,
        [
          { kg: 60, reps: 10, rir: 2 },
          { kg: 60, reps: 10, rir: 1 },
        ],
        t0,
      ),
    ]
    const s = suggestLoad(barbell, hypertrophy.reps, hypertrophy.rir, history)
    expect(s.kg).toBe(62.5)
    expect(s.note).toEqual({ key: 'load.increase', params: { from: 60, to: 62.5 } })
  })

  it('en el tope pero al fallo (menos reserva de la pedida): mantiene la carga', () => {
    const history = [makeSession(barbell.id, [{ kg: 60, reps: 10, rir: 0 }], t0)]
    expect(suggestLoad(barbell, hypertrophy.reps, hypertrophy.rir, history).note.key).toBe(
      'load.repeat',
    )
  })

  it('por debajo del mínimo en la mitad de las series: baja un 5-10 %', () => {
    const history = [
      makeSession(
        dumbbell.id,
        [
          { kg: 30, reps: 5 },
          { kg: 30, reps: 5 },
          { kg: 30, reps: 7 },
        ],
        t0,
      ),
    ]
    const s = suggestLoad(dumbbell, hypertrophy.reps, hypertrophy.rir, history)
    expect(s.note.key).toBe('load.decrease')
    expect(s.kg).toBe(28)
  })

  it('dentro del rango: misma carga y más repeticiones', () => {
    const history = [
      makeSession(
        barbell.id,
        [
          { kg: 70, reps: 8 },
          { kg: 70, reps: 7 },
        ],
        t0,
      ),
    ]
    expect(suggestLoad(barbell, hypertrophy.reps, hypertrophy.rir, history)).toEqual({
      kg: 70,
      note: { key: 'load.repeat', params: { kg: 70 } },
    })
  })

  it('usa la sesión más reciente', () => {
    const history = [
      makeSession(barbell.id, [{ kg: 50, reps: 10 }], t0),
      makeSession(barbell.id, [{ kg: 70, reps: 8 }], t0 + 7 * DAY),
    ]
    expect(suggestLoad(barbell, hypertrophy.reps, hypertrophy.rir, history).kg).toBe(70)
  })

  it('si el rango cambia mucho, recalcula desde el e1RM', () => {
    const history = [makeSession(barbell.id, [{ kg: 60, reps: 15, rir: 2 }], t0)]
    const s = suggestLoad(barbell, { min: 3, max: 6 }, { min: 1, max: 3 }, history)
    expect(s.note.key).toBe('load.fromE1rm')
    expect(s.kg).toBeGreaterThan(60)
  })

  it('peso corporal: progresa por repeticiones y luego por variante', () => {
    const top = [
      makeSession(
        pushups.id,
        [
          { kg: null, reps: 12 },
          { kg: null, reps: 12 },
        ],
        t0,
      ),
    ]
    expect(suggestLoad(pushups, { min: 8, max: 12 }, hypertrophy.rir, top).note.key).toBe(
      'load.harderVariant',
    )
    const mid = [makeSession(pushups.id, [{ kg: null, reps: 9 }], t0)]
    expect(suggestLoad(pushups, { min: 8, max: 12 }, hypertrophy.rir, mid).note.key).toBe(
      'load.addReps',
    )
  })

  it('ignora las series de calentamiento', () => {
    const session = makeSession(barbell.id, [{ kg: 70, reps: 8 }], t0)
    session.sets.unshift({
      exerciseId: barbell.id,
      kg: 20,
      reps: 15,
      rir: null,
      at: t0,
      warmup: true,
    })
    expect(suggestLoad(barbell, hypertrophy.reps, hypertrophy.rir, [session]).kg).toBe(70)
  })
})

describe('tendencia de rendimiento', () => {
  it('detecta una caída en dos sesiones seguidas', () => {
    const down = [
      makeSession(barbell.id, [{ kg: 80, reps: 8 }], t0),
      makeSession(barbell.id, [{ kg: 80, reps: 6 }], t0 + 3 * DAY),
      makeSession(barbell.id, [{ kg: 80, reps: 4 }], t0 + 6 * DAY),
    ]
    expect(isDeclining(down, barbell.id)).toBe(true)
    const up = [
      makeSession(barbell.id, [{ kg: 80, reps: 6 }], t0),
      makeSession(barbell.id, [{ kg: 80, reps: 7 }], t0 + 3 * DAY),
      makeSession(barbell.id, [{ kg: 80, reps: 8 }], t0 + 6 * DAY),
    ]
    expect(isDeclining(up, barbell.id)).toBe(false)
    expect(isDeclining(down.slice(0, 2), barbell.id)).toBe(false)
  })
})
