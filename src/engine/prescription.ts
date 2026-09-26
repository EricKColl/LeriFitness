/**
 * Repeticiones, esfuerzo (RIR) y descansos según objetivo, nivel y tipo de ejercicio.
 *
 * - Cargas de 6-30 repeticiones cerca del fallo producen hipertrofia similar (Schoenfeld 2021).
 * - Descansos largos en ejercicios multiarticulares favorecen el rendimiento (Schoenfeld 2016).
 * - El esfuerzo se regula con repeticiones en reserva (Zourdos 2016).
 */
import type { Exercise, Goal, Level } from '@/domain'

import type { RepRange, SlotRole } from './types'

export interface SetScheme {
  reps: RepRange
  rir: RepRange
  restSec: number
  /** `seconds` en ejercicios isométricos (planchas): el rango son segundos de mantenimiento. */
  unit: 'reps' | 'seconds'
}

type Kind = 'mainCompound' | 'compound' | 'isolation'

const SCHEMES: Record<Goal, Record<Kind, Omit<SetScheme, 'unit'>>> = {
  strength: {
    mainCompound: { reps: { min: 3, max: 6 }, rir: { min: 1, max: 3 }, restSec: 210 },
    compound: { reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 }, restSec: 120 },
    isolation: { reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 }, restSec: 90 },
  },
  hypertrophy: {
    mainCompound: { reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 }, restSec: 150 },
    compound: { reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 }, restSec: 120 },
    isolation: { reps: { min: 10, max: 15 }, rir: { min: 1, max: 2 }, restSec: 75 },
  },
  fatLoss: {
    mainCompound: { reps: { min: 8, max: 12 }, rir: { min: 2, max: 2 }, restSec: 90 },
    compound: { reps: { min: 8, max: 12 }, rir: { min: 2, max: 2 }, restSec: 90 },
    isolation: { reps: { min: 12, max: 15 }, rir: { min: 2, max: 2 }, restSec: 60 },
  },
  health: {
    mainCompound: { reps: { min: 8, max: 12 }, rir: { min: 2, max: 3 }, restSec: 90 },
    compound: { reps: { min: 8, max: 12 }, rir: { min: 2, max: 3 }, restSec: 90 },
    isolation: { reps: { min: 10, max: 15 }, rir: { min: 2, max: 3 }, restSec: 60 },
  },
  endurance: {
    mainCompound: { reps: { min: 12, max: 20 }, rir: { min: 2, max: 3 }, restSec: 60 },
    compound: { reps: { min: 12, max: 20 }, rir: { min: 2, max: 3 }, restSec: 50 },
    isolation: { reps: { min: 15, max: 25 }, rir: { min: 2, max: 3 }, restSec: 40 },
  },
}

/** Isométricos (planchas): segundos de mantenimiento por serie. */
const HOLDS: Record<Goal, RepRange> = {
  strength: { min: 20, max: 40 },
  hypertrophy: { min: 20, max: 45 },
  fatLoss: { min: 25, max: 45 },
  health: { min: 20, max: 40 },
  endurance: { min: 30, max: 60 },
}

export function setScheme(
  goal: Goal,
  level: Level,
  role: SlotRole,
  exercise: Pick<Exercise, 'mechanic' | 'force' | 'pattern'>,
  /** `false` si se mueve el propio cuerpo: se progresa por repeticiones y el rango sube. */
  loadable = true,
): SetScheme {
  const compound = exercise.mechanic !== 'isolation' && !exercise.pattern.startsWith('core')
  const kind: Kind =
    role === 'main' && compound ? 'mainCompound' : compound ? 'compound' : 'isolation'
  const base = SCHEMES[goal][kind]
  let reps = base.reps
  let rir = base.rir
  // Principiantes: más margen de reserva y, en fuerza, rangos algo más altos para aprender la técnica.
  if (level === 'beginner') {
    rir = { min: Math.max(rir.min, 2), max: Math.max(rir.max, 3) }
    if (goal === 'strength' && kind === 'mainCompound') reps = { min: 5, max: 8 }
  }
  if (exercise.force === 'static' && exercise.pattern.startsWith('core')) {
    return { reps: HOLDS[goal], rir, restSec: 60, unit: 'seconds' }
  }
  // Con el propio peso no se puede ajustar la carga a 3-6 repeticiones: se trabaja en rangos más altos.
  if (!loadable) reps = { min: Math.max(reps.min, 6), max: Math.max(reps.max, 12) }
  return { reps, rir, restSec: base.restSec, unit: 'reps' }
}

/** Series por hueco: mínimo, de partida y máximo. */
export function setBounds(role: SlotRole, goal: Goal, level: Level) {
  const max = level === 'beginner' ? 4 : role === 'main' && goal === 'strength' ? 5 : 4
  const start = role === 'main' ? 3 : 2
  // En fuerza, los básicos no bajan de 3 series.
  const min = role === 'main' && goal === 'strength' ? 3 : 2
  return { min, start: Math.min(start, max), max }
}
