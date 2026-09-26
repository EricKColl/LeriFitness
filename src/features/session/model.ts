/**
 * Modelo de la sesión en vivo: funciones puras sobre un estado serializable que se guarda en
 * IndexedDB a cada cambio (así la sesión sobrevive a recargas, cierres y bloqueos del móvil).
 */
import type { Equipment, LoggedSet, SessionLog } from '@/domain'
import {
  isLoadable,
  loadIncrement,
  type ExerciseRef,
  type PlanDay,
  type Prescription,
} from '@/engine'

export interface SessionItem {
  slotId: string
  exerciseId: string
  /** Ejercicio que proponía el plan (si se ha cambiado por una alternativa). */
  plannedExerciseId: string
  sets: number
  reps: { min: number; max: number }
  unit: 'reps' | 'seconds'
  rir: { min: number; max: number }
  restSec: number
  loadKg: number | null
  loadNote: Prescription['loadNote']
  alternatives: string[]
  skipped: boolean
}

export interface SessionState {
  items: SessionItem[]
  current: number
  /** Marca de tiempo (ms) en la que termina el descanso en curso. */
  restEndsAt: number | null
  restTotal: number
}

export interface ActiveSession {
  session: SessionLog
  state: SessionState
}

export function startSession(
  day: PlanDay,
  planId: string,
  date: string,
  now: number,
): ActiveSession {
  return {
    session: {
      id: `s-${now.toString(36)}`,
      dayId: day.id,
      planId,
      date,
      startedAt: now,
      endedAt: null,
      sets: [],
      rpe: null,
    },
    state: {
      items: day.prescriptions.map((p) => ({
        slotId: p.slotId,
        exerciseId: p.exerciseId,
        plannedExerciseId: p.exerciseId,
        sets: p.sets,
        reps: p.reps,
        unit: p.unit,
        rir: p.rir,
        restSec: p.restSec,
        loadKg: p.loadKg,
        loadNote: p.loadNote,
        alternatives: p.alternatives,
        skipped: false,
      })),
      current: 0,
      restEndsAt: null,
      restTotal: 0,
    },
  }
}

export function setsFor(active: ActiveSession, index: number): LoggedSet[] {
  const item = active.state.items[index]
  if (!item) return []
  return active.session.sets.filter((s) => s.exerciseId === item.exerciseId && !s.warmup)
}

export function isItemDone(active: ActiveSession, index: number) {
  const item = active.state.items[index]
  return !!item && (item.skipped || setsFor(active, index).length >= item.sets)
}

/** Primer ejercicio sin terminar a partir de `from` (dando la vuelta), o `null` si no queda ninguno. */
export function nextPending(active: ActiveSession, from: number) {
  const n = active.state.items.length
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n
    if (!isItemDone(active, i)) return i
  }
  return null
}

export function logSet(active: ActiveSession, set: LoggedSet): ActiveSession {
  const index = active.state.current
  const item = active.state.items[index]
  if (!item) return active
  const next: ActiveSession = {
    session: { ...active.session, sets: [...active.session.sets, set] },
    state: { ...active.state },
  }
  const done = isItemDone(next, index)
  const allDone = nextPending(next, index) === null
  // Descanso tras cada serie salvo al terminar la sesión.
  next.state.restEndsAt = allDone ? null : set.at + item.restSec * 1000
  next.state.restTotal = allDone ? 0 : item.restSec
  if (done && !allDone) next.state.current = nextPending(next, index) ?? index
  return next
}

export function undoLastSet(active: ActiveSession): ActiveSession {
  const sets = active.session.sets
  const last = sets[sets.length - 1]
  if (!last) return active
  const index = active.state.items.findIndex((i) => i.exerciseId === last.exerciseId)
  return {
    session: { ...active.session, sets: sets.slice(0, -1) },
    state: {
      ...active.state,
      current: index >= 0 ? index : active.state.current,
      restEndsAt: null,
      restTotal: 0,
    },
  }
}

function updateItem(active: ActiveSession, index: number, patch: Partial<SessionItem>) {
  return {
    ...active,
    state: {
      ...active.state,
      items: active.state.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    },
  }
}

export function addSet(active: ActiveSession, index: number) {
  const item = active.state.items[index]
  return item
    ? updateItem(active, index, { sets: Math.min(item.sets + 1, 10), skipped: false })
    : active
}

export function removeSet(active: ActiveSession, index: number) {
  const item = active.state.items[index]
  if (!item) return active
  const minimum = Math.max(1, setsFor(active, index).length)
  return updateItem(active, index, { sets: Math.max(minimum, item.sets - 1) })
}

export function skipItem(active: ActiveSession, index: number) {
  const skipped = updateItem(active, index, { skipped: true })
  const next = nextPending(skipped, index)
  return { ...skipped, state: { ...skipped.state, current: next ?? index } }
}

/** Cambia el ejercicio del hueco; la carga sugerida ya no aplica al nuevo. */
export function substitute(active: ActiveSession, index: number, exerciseId: string) {
  const item = active.state.items[index]
  if (!item || setsFor(active, index).length > 0) return active
  return updateItem(active, index, {
    exerciseId,
    loadKg: exerciseId === item.plannedExerciseId ? item.loadKg : null,
    loadNote: exerciseId === item.plannedExerciseId ? item.loadNote : { key: 'load.calibrate' },
  })
}

export function goTo(active: ActiveSession, index: number): ActiveSession {
  if (index < 0 || index >= active.state.items.length) return active
  return { ...active, state: { ...active.state, current: index } }
}

export function adjustRest(active: ActiveSession, deltaSec: number, now: number): ActiveSession {
  const { restEndsAt } = active.state
  if (restEndsAt === null) return active
  const ends = Math.max(now, restEndsAt + deltaSec * 1000)
  return {
    ...active,
    state: {
      ...active.state,
      restEndsAt: ends,
      restTotal: Math.max(1, active.state.restTotal + deltaSec),
    },
  }
}

export function endRest(active: ActiveSession): ActiveSession {
  return { ...active, state: { ...active.state, restEndsAt: null, restTotal: 0 } }
}

export function finishSession(active: ActiveSession, now: number): SessionLog {
  return { ...active.session, endedAt: now }
}

export function progress(active: ActiveSession) {
  const total = active.state.items.reduce((sum, i) => sum + (i.skipped ? 0 : i.sets), 0)
  const done = active.state.items.reduce(
    (sum, _, index) =>
      sum + Math.min(setsFor(active, index).length, active.state.items[index]!.sets),
    0,
  )
  return { done, total }
}

/** Carga por defecto cuando no hay sugerencia ni historial (calibración). */
export function defaultLoad(equipment: readonly Equipment[]) {
  if (equipment.includes('barbell')) return 20
  if (equipment.includes('machine') || equipment.includes('cable')) return 20
  if (equipment.includes('kettlebell')) return 8
  if (equipment.includes('dumbbell')) return 8
  return 10
}

/**
 * Valores propuestos para la siguiente serie: la anterior de esta sesión; si no, la carga
 * sugerida por el plan; si no, la última vez en el historial; si no, una carga de partida.
 */
export function proposal(
  active: ActiveSession,
  exercise: ExerciseRef,
  lastTime: readonly LoggedSet[],
) {
  const item = active.state.items[active.state.current]
  const done = setsFor(active, active.state.current)
  const previous = done[done.length - 1]
  const loadable = isLoadable(exercise)
  const reps = previous?.reps ?? lastTime[done.length]?.reps ?? item?.reps.max ?? 10
  let kg: number | null = null
  if (loadable)
    kg =
      previous?.kg ??
      item?.loadKg ??
      lastTime[done.length]?.kg ??
      lastTime[0]?.kg ??
      defaultLoad(exercise.equipment)
  return { kg, reps, step: loadIncrement(exercise.equipment) }
}
