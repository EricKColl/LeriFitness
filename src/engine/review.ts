/**
 * Resumen de la semana entrenada: adherencia, esfuerzo de sesión, tendencia de los ejercicios
 * principales y check-in. Es la entrada de `advanceWeek`.
 */
import type { CheckIn, SessionLog } from '@/domain'

import { isDeclining } from './progression'
import type { Plan, WeekReview } from './types'

export function reviewWeek(
  plan: Pick<Plan, 'days'>,
  weekSessions: readonly SessionLog[],
  history: readonly SessionLog[],
  checkIn: CheckIn | null,
): WeekReview {
  const completed = weekSessions.filter((s) => s.endedAt !== null && s.sets.length > 0)
  const rpes = completed.map((s) => s.rpe).filter((r): r is number => r !== null)
  const mainLifts = new Set(
    plan.days.flatMap((d) =>
      d.prescriptions.filter((p) => p.role === 'main').map((p) => p.exerciseId),
    ),
  )
  const decliningLifts = [...mainLifts].filter((id) => isDeclining(history, id)).length
  return {
    plannedSessions: plan.days.length,
    completedSessions: Math.min(completed.length, plan.days.length),
    averageRpe: rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null,
    decliningLifts,
    checkIn,
  }
}
