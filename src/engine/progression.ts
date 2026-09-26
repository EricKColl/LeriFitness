/**
 * Sobrecarga progresiva con doble progresión: primero se suben repeticiones dentro del rango y,
 * cuando todas las series llegan al tope con el esfuerzo objetivo, se sube la carga y se vuelve
 * al mínimo del rango.
 *
 * e1RM estimado con Epley corregido por RIR: e1RM = kg × (1 + (reps + RIR) / 30).
 */
import type { Equipment, LoggedSet, SessionLog } from '@/domain'

import type { Reason, RepRange } from './types'

/** Lo mínimo que necesita la progresión de un ejercicio. */
export interface ExerciseRef {
  id: string
  equipment: readonly Equipment[]
}

export function estimate1RM(kg: number, reps: number, rir = 0) {
  return kg * (1 + (reps + rir) / 30)
}

/** Carga que permite `reps` repeticiones dejando `rir` en reserva. */
export function loadFor1RM(e1rm: number, reps: number, rir: number) {
  return e1rm / (1 + (reps + rir) / 30)
}

/** Incremento mínimo y redondeo por tipo de material. */
export function loadIncrement(equipment: readonly Equipment[]) {
  if (equipment.includes('kettlebell')) return 4
  if (equipment.includes('dumbbell')) return 2
  if (equipment.includes('barbell') || equipment.includes('ezBar')) return 2.5
  if (equipment.includes('machine') || equipment.includes('cable')) return 2.5
  return 0
}

/**
 * Movimientos en los que se mueve el propio cuerpo aunque el material incluya una barra o una
 * mancuerna como apoyo (remo invertido en barra, flexiones sobre mancuernas…).
 */
const BODYWEIGHT_MOVES =
  /inverted-row|push-?ups?\b|pushups|pullups|pull-ups?\b|chin-up|dips\b|bench-dips|muscle-up|handstand|glute-ham|hanging|body-/

/** ¿Se progresa añadiendo carga externa? (No en peso corporal ni bandas). */
export function isLoadable(exercise: ExerciseRef) {
  if (exercise.equipment.includes('machine') || exercise.equipment.includes('cable')) return true
  if (BODYWEIGHT_MOVES.test(exercise.id) && !exercise.id.startsWith('weighted')) return false
  return loadIncrement(exercise.equipment) > 0
}

export function roundLoad(kg: number, equipment: readonly Equipment[]) {
  const step = loadIncrement(equipment)
  if (step === 0) return kg
  const rounded = Math.round(kg / step) * step
  // Una barra olímpica vacía pesa 20 kg: por debajo no tiene sentido sugerir carga con barra.
  const floor = equipment.includes('barbell') ? 20 : step
  return Math.max(floor, Math.round(rounded * 10) / 10)
}

export function workingSets(sets: readonly LoggedSet[], exerciseId: string) {
  return sets.filter((s) => s.exerciseId === exerciseId && !s.warmup && s.reps > 0)
}

/** Sesiones (más reciente primero) en las que se registró el ejercicio. */
export function sessionsWith(history: readonly SessionLog[], exerciseId: string) {
  return history
    .filter((session) => workingSets(session.sets, exerciseId).length > 0)
    .sort((a, b) => b.startedAt - a.startedAt)
}

/** Mejor e1RM de una sesión para un ejercicio (si hay carga registrada). */
export function sessionBest1RM(session: SessionLog, exerciseId: string) {
  let best = 0
  for (const s of workingSets(session.sets, exerciseId)) {
    if (s.kg === null || s.kg <= 0) continue
    best = Math.max(best, estimate1RM(s.kg, s.reps, s.rir ?? 0))
  }
  return best > 0 ? best : null
}

export interface LoadSuggestion {
  kg: number | null
  note: Reason
}

/**
 * Carga sugerida para hoy a partir de la última sesión con este ejercicio.
 * Sin historial: semana de calibración («elige un peso que te deje 2-3 repeticiones en reserva»).
 */
export function suggestLoad(
  exercise: ExerciseRef,
  reps: RepRange,
  rir: RepRange,
  history: readonly SessionLog[],
): LoadSuggestion {
  const last = sessionsWith(history, exercise.id)[0]
  const loadable = isLoadable(exercise)
  if (!last) {
    return {
      kg: null,
      note: { key: loadable ? 'load.calibrate' : 'load.bodyweightStart' },
    }
  }
  const sets = workingSets(last.sets, exercise.id)
  const allTop = sets.every((s) => s.reps >= reps.max && (s.rir === null || s.rir >= rir.min))
  const below = sets.filter((s) => s.reps < reps.min).length
  const mostlyBelow = below >= Math.ceil(sets.length / 2)

  if (!loadable) {
    if (allTop) return { kg: null, note: { key: 'load.harderVariant' } }
    return { kg: null, note: { key: 'load.addReps' } }
  }

  const loaded = sets.filter((s) => s.kg !== null && s.kg > 0)
  if (loaded.length === 0) return { kg: null, note: { key: 'load.calibrate' } }
  const lastKg = Math.max(...loaded.map((s) => s.kg ?? 0))
  const avgReps = loaded.reduce((sum, s) => sum + s.reps, 0) / loaded.length

  // Si el rango ha cambiado mucho (nuevo objetivo o mesociclo), se recalcula desde el e1RM.
  if (avgReps > reps.max + 3 || avgReps < reps.min - 3) {
    const e1rm = sessionBest1RM(last, exercise.id)
    if (e1rm) {
      const target = (reps.min + reps.max) / 2
      const kg = roundLoad(loadFor1RM(e1rm, target, (rir.min + rir.max) / 2), exercise.equipment)
      return { kg, note: { key: 'load.fromE1rm', params: { kg } } }
    }
  }

  if (allTop) {
    const kg = roundLoad(lastKg + loadIncrement(exercise.equipment), exercise.equipment)
    return { kg, note: { key: 'load.increase', params: { from: lastKg, to: kg } } }
  }
  if (mostlyBelow) {
    const kg = roundLoad(lastKg * 0.925, exercise.equipment)
    return {
      kg: Math.min(kg, lastKg),
      note: { key: 'load.decrease', params: { from: lastKg, to: Math.min(kg, lastKg) } },
    }
  }
  return { kg: lastKg, note: { key: 'load.repeat', params: { kg: lastKg } } }
}

/** ¿Ha bajado el rendimiento en las dos últimas sesiones con este ejercicio? */
export function isDeclining(history: readonly SessionLog[], exerciseId: string) {
  const [a, b, c] = sessionsWith(history, exerciseId)
    .slice(0, 3)
    .map((s) => sessionBest1RM(s, exerciseId))
  if (a == null || b == null || c == null) return false
  return a < b * 0.99 && b < c * 0.99
}
