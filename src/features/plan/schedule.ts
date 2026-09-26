/**
 * Calendario de la semana: reparte los días del plan entre los días elegidos por la persona y
 * marca lo ya entrenado. Si se entrena otro día distinto al previsto no pasa nada: la «próxima
 * sesión» es siempre el primer día del plan aún sin hacer.
 */
import type { SessionLog, Weekday } from '@/domain'
import type { Plan, PlanDay } from '@/engine'
import { addDays, weekdayOf } from '@/shared/lib/dates'

export interface ScheduleDay {
  date: string
  weekday: Weekday
  /** Día del plan previsto para esta fecha. */
  planned: PlanDay | null
  /** Sesiones terminadas en esta fecha. */
  done: SessionLog[]
  isToday: boolean
  isPast: boolean
}

export function finishedSessions(sessions: readonly SessionLog[]) {
  return sessions.filter((s) => s.endedAt !== null && s.sets.some((set) => !set.warmup))
}

/** Días del plan ya hechos esta semana (por id de día, que es estable entre semanas). */
export function completedDayIds(sessions: readonly SessionLog[]) {
  return new Set(finishedSessions(sessions).map((s) => s.dayId))
}

export function nextPlanDay(plan: Plan, weekSessions: readonly SessionLog[]) {
  const done = completedDayIds(weekSessions)
  return plan.days.find((d) => !done.has(d.id)) ?? null
}

/** Fecha prevista para cada día del plan (los días de la semana ordenados). */
export function plannedDates(plan: Plan, weekdays: readonly Weekday[], weekStart: string) {
  const sorted = [...weekdays].sort((a, b) => a - b)
  return new Map(
    plan.days.map((day, i) => [
      day.id,
      sorted[i] === undefined ? null : addDays(weekStart, sorted[i]),
    ]),
  )
}

export function weekSchedule(
  plan: Plan,
  weekdays: readonly Weekday[],
  weekStart: string,
  weekSessions: readonly SessionLog[],
  todayIso: string,
): ScheduleDay[] {
  const dates = plannedDates(plan, weekdays, weekStart)
  const finished = finishedSessions(weekSessions)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    return {
      date,
      weekday: weekdayOf(date),
      planned: plan.days.find((d) => dates.get(d.id) === date) ?? null,
      done: finished.filter((s) => s.date === date),
      isToday: date === todayIso,
      isPast: date < todayIso,
    }
  })
}

/**
 * Cuándo toca la próxima sesión: hoy si ya se ha pasado su fecha prevista o es hoy (y hoy no se
 * ha entrenado aún); si no, su fecha prevista.
 */
export function nextSessionWhen(
  day: PlanDay,
  plan: Plan,
  weekdays: readonly Weekday[],
  weekStart: string,
  weekSessions: readonly SessionLog[],
  todayIso: string,
): { kind: 'today' } | { kind: 'later'; date: string } | { kind: 'rest' } {
  const trainedToday = finishedSessions(weekSessions).some((s) => s.date === todayIso)
  const date = plannedDates(plan, weekdays, weekStart).get(day.id) ?? null
  if (trainedToday) return date && date > todayIso ? { kind: 'later', date } : { kind: 'rest' }
  if (!date || date <= todayIso) return { kind: 'today' }
  return { kind: 'later', date }
}
