/**
 * Acondicionamiento aeróbico. La OMS (2020) recomienda a los adultos 150-300 minutos semanales de
 * actividad aeróbica moderada y al menos 2 días de fuerza. El cardio se añade al final de la sesión
 * cuando el objetivo lo pide y el tiempo lo permite; si no, se recomienda en días de descanso.
 */
import type { Exercise, Goal } from '@/domain'

import { isSafeAndAvailable, type SelectionContext } from './selection'
import type { CardioBlock } from './types'

/** Minutos de acondicionamiento al final de cada sesión según el objetivo. */
export const CONDITIONING_MINUTES: Partial<Record<Goal, number>> = {
  fatLoss: 15,
  endurance: 20,
  health: 10,
}

/** Recomendación semanal total de actividad aeróbica (dentro y fuera del gimnasio). */
export const WEEKLY_CARDIO_MINUTES: Record<Goal, number> = {
  strength: 150,
  hypertrophy: 150,
  health: 150,
  fatLoss: 225,
  endurance: 300,
}

const INTENSITY: Record<Goal, CardioBlock['intensity']> = {
  strength: 'easy',
  hypertrophy: 'easy',
  health: 'moderate',
  fatLoss: 'moderate',
  endurance: 'intervals',
}

/** Mejor máquina o actividad de cardio disponible y segura para el usuario. */
export function pickCardio(catalog: readonly Exercise[], ctx: SelectionContext) {
  const options = catalog
    .filter((e) => e.pattern === 'cardio' && e.staple > 0 && isSafeAndAvailable(e, ctx))
    .sort((a, b) => b.staple - a.staple || a.id.localeCompare(b.id))
  return options[0] ?? null
}

export function conditioningBlock(
  goal: Goal,
  minutes: number,
  catalog: readonly Exercise[],
  ctx: SelectionContext,
): CardioBlock {
  const exercise = pickCardio(catalog, ctx)
  return { exerciseId: exercise?.id ?? null, minutes, intensity: INTENSITY[goal] }
}
