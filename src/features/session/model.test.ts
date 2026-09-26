import { describe, expect, it } from 'vitest'

import { generatePlan } from '@/engine'
import { CATALOG, makeProfile } from '@/test/fixtures'

import {
  addSet,
  adjustRest,
  finishSession,
  logSet,
  nextPending,
  progress,
  proposal,
  skipItem,
  startSession,
  substitute,
  undoLastSet,
} from './model'

const plan = generatePlan({ profile: makeProfile(), catalog: CATALOG })
const day = plan.days[0]!
const t0 = 1_000_000

function fresh() {
  return startSession(day, 'plan-1', '2026-09-21', t0)
}

function logAll(active = fresh(), count = 1) {
  let a = active
  for (let i = 0; i < count; i++) {
    const item = a.state.items[a.state.current]!
    a = logSet(a, { exerciseId: item.exerciseId, kg: 50, reps: 8, rir: 2, at: t0 + i * 1000 })
  }
  return a
}

describe('sesión en vivo', () => {
  it('empieza con los ejercicios del día', () => {
    const a = fresh()
    expect(a.state.items.map((i) => i.exerciseId)).toEqual(
      day.prescriptions.map((p) => p.exerciseId),
    )
    expect(progress(a).done).toBe(0)
  })

  it('registra series, lanza el descanso y pasa al siguiente al completar', () => {
    const first = day.prescriptions[0]!
    let a = logAll(fresh(), 1)
    expect(a.state.restEndsAt).toBe(t0 + first.restSec * 1000)
    expect(a.state.current).toBe(0)
    a = logAll(a, first.sets - 1)
    expect(a.state.current).toBe(1)
  })

  it('deshace la última serie', () => {
    const a = undoLastSet(logAll(fresh(), 2))
    expect(a.session.sets).toHaveLength(1)
    expect(a.state.restEndsAt).toBeNull()
  })

  it('añade y salta series y ejercicios', () => {
    let a = addSet(fresh(), 0)
    expect(a.state.items[0]!.sets).toBe(day.prescriptions[0]!.sets + 1)
    a = skipItem(a, 0)
    expect(a.state.current).toBe(1)
    expect(nextPending(a, 0)).toBe(1)
  })

  it('sustituye un ejercicio solo si aún no tiene series', () => {
    const item = fresh().state.items[0]!
    const alt = item.alternatives[0]!
    const a = substitute(fresh(), 0, alt)
    expect(a.state.items[0]!.exerciseId).toBe(alt)
    expect(a.state.items[0]!.loadKg).toBeNull()
    expect(substitute(logAll(fresh(), 1), 0, alt).state.items[0]!.exerciseId).toBe(item.exerciseId)
  })

  it('sin descanso tras la última serie de la sesión', () => {
    const total = day.prescriptions.reduce((s, p) => s + p.sets, 0)
    const a = logAll(fresh(), total)
    expect(nextPending(a, 0)).toBeNull()
    expect(a.state.restEndsAt).toBeNull()
    expect(finishSession(a, t0 + 5).endedAt).toBe(t0 + 5)
  })

  it('ajusta el descanso sin dejarlo en negativo', () => {
    const a = logAll(fresh(), 1)
    expect(adjustRest(a, 15, t0).state.restEndsAt).toBe(a.state.restEndsAt! + 15_000)
    expect(adjustRest(a, -9999, t0 + 500).state.restEndsAt).toBe(t0 + 500)
  })

  it('propone los valores de la serie anterior o de la última vez', () => {
    const squat = { id: 'barbell-squat', equipment: ['barbell', 'rack'] as const }
    const a = {
      ...fresh(),
      state: { ...fresh().state, items: fresh().state.items.map((i) => ({ ...i, loadKg: null })) },
    }
    expect(proposal(a, squat, []).kg).toBe(20)
    expect(
      proposal(a, squat, [{ exerciseId: 'barbell-squat', kg: 70, reps: 6, rir: 2, at: 0 }]),
    ).toMatchObject({ kg: 70, reps: 6, step: 2.5 })
    expect(proposal(a, { id: 'pushups', equipment: ['bodyweight'] }, []).kg).toBeNull()
  })
})
