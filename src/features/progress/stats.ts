/**
 * Estadísticas de entrenamiento a partir del registro de sesiones. Funciones puras y testadas.
 */
import { MUSCLES, type Exercise, type Muscle, type SessionLog } from '@/domain'
import { estimate1RM } from '@/engine'
import { addDays, weekStartOf } from '@/shared/lib/dates'

export function isFinished(session: SessionLog) {
  return session.endedAt !== null && session.sets.some((s) => !s.warmup)
}

export function workSets(session: SessionLog) {
  return session.sets.filter((s) => !s.warmup && s.reps > 0)
}

/** Volumen de carga (kg × repeticiones) de las series efectivas con carga externa. */
export function sessionTonnage(session: SessionLog) {
  return workSets(session).reduce((sum, s) => sum + (s.kg ?? 0) * s.reps, 0)
}

export function sessionMinutes(session: SessionLog) {
  if (session.endedAt === null) return 0
  return Math.max(1, Math.round((session.endedAt - session.startedAt) / 60_000))
}

export function sessionsByWeek(sessions: readonly SessionLog[]) {
  const map = new Map<string, SessionLog[]>()
  for (const s of sessions.filter(isFinished)) {
    const week = weekStartOf(s.date)
    map.set(week, [...(map.get(week) ?? []), s])
  }
  return map
}

/**
 * Racha semanal: semanas seguidas en las que se entrenó al menos `min(objetivo, 2)` días. La semana
 * actual solo suma si ya se cumplió; si aún no, no rompe la racha.
 */
export function streakWeeks(
  sessions: readonly SessionLog[],
  weeklyTarget: number,
  currentWeek: string,
) {
  const needed = Math.max(1, Math.min(weeklyTarget, 2))
  const byWeek = sessionsByWeek(sessions)
  const kept = (week: string) => (byWeek.get(week)?.length ?? 0) >= needed
  let streak = kept(currentWeek) ? 1 : 0
  for (let week = addDays(currentWeek, -7); kept(week); week = addDays(week, -7)) streak++
  return streak
}

export function bestSetE1RM(session: SessionLog, exerciseId: string) {
  let best: { e1rm: number; kg: number; reps: number } | null = null
  for (const s of workSets(session)) {
    if (s.exerciseId !== exerciseId || !s.kg) continue
    const e1rm = estimate1RM(s.kg, s.reps, s.rir ?? 0)
    if (!best || e1rm > best.e1rm) best = { e1rm, kg: s.kg, reps: s.reps }
  }
  return best
}

/** Evolución del e1RM de un ejercicio (mejor serie de cada sesión). */
export function e1rmSeries(sessions: readonly SessionLog[], exerciseId: string) {
  return sessions
    .filter(isFinished)
    .map((s) => ({ date: s.date, at: s.startedAt, best: bestSetE1RM(s, exerciseId) }))
    .filter((p): p is { date: string; at: number; best: NonNullable<typeof p.best> } => !!p.best)
    .sort((a, b) => a.at - b.at)
    .map((p) => ({
      date: p.date,
      value: Math.round(p.best.e1rm * 10) / 10,
      kg: p.best.kg,
      reps: p.best.reps,
    }))
}

/** Ejercicios en los que la sesión superó el mejor e1RM previo (récord personal). */
export function sessionRecords(session: SessionLog, history: readonly SessionLog[]) {
  const previous = history.filter(
    (s) => s.id !== session.id && s.startedAt < session.startedAt && isFinished(s),
  )
  const ids = new Set(workSets(session).map((s) => s.exerciseId))
  const records: { exerciseId: string; e1rm: number; previous: number }[] = []
  for (const id of ids) {
    const now = bestSetE1RM(session, id)
    if (!now) continue
    let before = 0
    for (const s of previous) before = Math.max(before, bestSetE1RM(s, id)?.e1rm ?? 0)
    if (before > 0 && now.e1rm > before + 0.01)
      records.push({ exerciseId: id, e1rm: now.e1rm, previous: before })
  }
  return records
}

/** Series efectivas por músculo (conteo fraccional: 1 principal, 0,5 secundario). */
export function muscleSets(sessions: readonly SessionLog[], byId: ReadonlyMap<string, Exercise>) {
  const sets = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>
  for (const session of sessions)
    for (const s of workSets(session)) {
      const e = byId.get(s.exerciseId)
      if (!e) continue
      for (const m of e.primaryMuscles) sets[m] += 1
      for (const m of e.secondaryMuscles) sets[m] += 0.5
    }
  return sets
}

/** Nivel de calor 0-5 del mapa muscular según series hechas frente al rango semanal. */
export function heatLevel(done: number, range: { min: number; max: number }) {
  if (done <= 0) return 0
  const target = range.min > 0 ? range.min : Math.max(2, range.max / 2)
  const ratio = done / target
  if (ratio < 0.34) return 1
  if (ratio < 0.67) return 2
  if (ratio < 1) return 3
  if (done <= range.max) return 4
  return 5
}

/** Toneladas y sesiones por semana de las últimas `weeks` semanas (incluida la actual). */
export function weeklySummary(sessions: readonly SessionLog[], currentWeek: string, weeks = 8) {
  const byWeek = sessionsByWeek(sessions)
  return Array.from({ length: weeks }, (_, i) => {
    const week = addDays(currentWeek, -7 * (weeks - 1 - i))
    const list = byWeek.get(week) ?? []
    return {
      week,
      sessions: list.length,
      tonnage: list.reduce((sum, s) => sum + sessionTonnage(s), 0),
      sets: list.reduce((sum, s) => sum + workSets(s).length, 0),
    }
  })
}
