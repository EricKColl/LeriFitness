/**
 * Fechas locales en formato `YYYY-MM-DD`. La semana empieza en lunes (convención española).
 * Se trabaja con la fecha local del dispositivo, no con UTC, para que «hoy» sea el día del usuario.
 */
import type { Weekday } from '@/domain'

export const DAY_MS = 86_400_000

export function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Fecha local a partir de `YYYY-MM-DD` (a mediodía para evitar saltos por cambio de hora). */
export function fromISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12)
}

export function addDays(iso: string, days: number) {
  const date = fromISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Día de la semana con lunes = 0. */
export function weekdayOf(iso: string): Weekday {
  return ((fromISODate(iso).getDay() + 6) % 7) as Weekday
}

/** Lunes de la semana de una fecha. */
export function weekStartOf(iso: string) {
  return addDays(iso, -weekdayOf(iso))
}

/** Semanas completas entre dos lunes. */
export function weeksBetween(fromMonday: string, toMonday: string) {
  return Math.round(
    (fromISODate(toMonday).getTime() - fromISODate(fromMonday).getTime()) / (7 * DAY_MS),
  )
}

export function daysBetween(from: string, to: string) {
  return Math.round((fromISODate(to).getTime() - fromISODate(from).getTime()) / DAY_MS)
}

export function today() {
  return toISODate(new Date())
}

export function isInWeek(iso: string, monday: string) {
  const diff = daysBetween(monday, iso)
  return diff >= 0 && diff < 7
}
