/**
 * Mesociclos, descargas y adaptación semana a semana.
 *
 * - Principiante: 6 semanas + 1 de descarga; intermedio y avanzado: 4 + 1.
 * - +1 serie por músculo y semana si la adherencia es ≥ 90 % y no hay señales de fatiga;
 *   se mantiene entre 70 y 90 %; se reduce por debajo del 70 %.
 * - Descarga anticipada si el rendimiento cae dos sesiones seguidas, el RPE de sesión es muy alto
 *   o el check-in indica mucha fatiga (consenso sobre descargas, Bell 2023).
 */
import type { Level } from '@/domain'

import type { MesocycleState, Reason, WeekReview } from './types'

export const MESOCYCLE_WEEKS: Record<Level, number> = {
  beginner: 7,
  intermediate: 5,
  advanced: 5,
}

/** Máximo de series extra por músculo sobre la base dentro de un mesociclo. */
export const MAX_VOLUME_STEP = 4

export function initialMesocycle(level: Level): MesocycleState {
  return {
    index: 1,
    week: 1,
    length: MESOCYCLE_WEEKS[level],
    volumeStep: 0,
    deload: false,
    calibration: true,
  }
}

export interface Advance {
  next: MesocycleState
  reasons: Reason[]
}

function fatigueSignals(review: WeekReview) {
  const c = review.checkIn
  const strong =
    review.decliningLifts >= 2 ||
    (review.averageRpe !== null && review.averageRpe >= 9) ||
    (c !== null && (c.soreness >= 5 || (c.energy <= 2 && c.sleep <= 2)))
  const mild =
    strong ||
    review.decliningLifts >= 1 ||
    (review.averageRpe !== null && review.averageRpe >= 8.5) ||
    (c !== null && (c.soreness >= 4 || c.energy <= 2 || c.sleep <= 2))
  return { strong, mild }
}

/** Estado de la semana siguiente a partir del resumen de la semana terminada. */
export function advanceWeek(state: MesocycleState, review: WeekReview, level: Level): Advance {
  const reasons: Reason[] = []

  if (state.deload) {
    reasons.push({ key: 'reasons.adapt.newMesocycle', params: { index: state.index + 1 } })
    return {
      next: {
        index: state.index + 1,
        week: 1,
        length: MESOCYCLE_WEEKS[level],
        volumeStep: 0,
        deload: false,
        calibration: false,
      },
      reasons,
    }
  }

  const adherence =
    review.plannedSessions > 0 ? review.completedSessions / review.plannedSessions : 1
  const percent = Math.round(adherence * 100)
  const fatigue = fatigueSignals(review)
  let volumeStep = state.volumeStep

  if (fatigue.strong && state.week >= 2) {
    reasons.push({ key: 'reasons.adapt.earlyDeload' })
    return {
      next: { ...state, week: state.week + 1, deload: true, calibration: false },
      reasons,
    }
  }

  if (adherence < 0.7) {
    volumeStep = Math.max(0, volumeStep - 1)
    reasons.push({ key: 'reasons.adapt.lowAdherence', params: { percent } })
  } else if (adherence < 0.9 || fatigue.mild) {
    reasons.push({
      key: fatigue.mild ? 'reasons.adapt.holdFatigue' : 'reasons.adapt.holdAdherence',
      params: { percent },
    })
  } else {
    volumeStep = Math.min(MAX_VOLUME_STEP, volumeStep + 1)
    reasons.push({ key: 'reasons.adapt.increase', params: { percent } })
  }

  const week = state.week + 1
  const deload = week >= state.length
  if (deload) reasons.push({ key: 'reasons.adapt.plannedDeload' })
  return {
    next: { ...state, week, volumeStep, deload, calibration: false },
    reasons,
  }
}

/** Molestias del check-in: se tratan como lesión leve temporal durante una semana. */
export function checkInPainReason(zones: readonly string[]): Reason[] {
  return zones.map((zone) => ({ key: 'reasons.adapt.temporaryPain', params: { zone } }))
}
