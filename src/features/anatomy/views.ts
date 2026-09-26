import { MUSCLE_INFO, type Muscle } from '@/domain'

import type { HeatLevel, View } from './body-map'

/** Vista (frente o espalda) en la que se ven mejor estos músculos. */
export function dominantView(muscles: readonly Muscle[]): View {
  const back = muscles.filter((m) => MUSCLE_INFO[m].views[0] === 'back').length
  return back > muscles.length / 2 ? 'back' : 'front'
}

/** Calor para resaltar un ejercicio: principales intensos, secundarios suaves. */
export function exerciseHeat(primary: readonly Muscle[], secondary: readonly Muscle[]) {
  const heat: Partial<Record<Muscle, HeatLevel>> = {}
  for (const m of secondary) heat[m] = 2
  for (const m of primary) heat[m] = 4
  return heat
}

/**
 * Calor de una sesión según sus series por músculo (1 si es principal, 0,5 si ayuda). En una
 * sesión, 2-8 series por músculo es lo habitual.
 */
export function sessionHeat(
  prescriptions: readonly { exerciseId: string; sets: number }[],
  byId: ReadonlyMap<
    string,
    { primaryMuscles: readonly Muscle[]; secondaryMuscles: readonly Muscle[] }
  >,
) {
  const sets = new Map<Muscle, number>()
  for (const p of prescriptions) {
    const e = byId.get(p.exerciseId)
    if (!e) continue
    for (const m of e.primaryMuscles) sets.set(m, (sets.get(m) ?? 0) + p.sets)
    for (const m of e.secondaryMuscles) sets.set(m, (sets.get(m) ?? 0) + p.sets / 2)
  }
  const heat: Partial<Record<Muscle, HeatLevel>> = {}
  for (const [m, n] of sets) heat[m] = n < 1.5 ? 1 : n < 3 ? 2 : n < 5 ? 3 : n < 8 ? 4 : 5
  const ranked = [...sets.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m)
  return { heat, top: ranked.slice(0, 4) }
}
