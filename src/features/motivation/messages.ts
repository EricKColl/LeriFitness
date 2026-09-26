/**
 * Mensajes de motivación por contexto con elección determinista diaria: el mismo día y contexto
 * muestran siempre el mismo mensaje (sin parpadeos entre renders ni azar).
 */
export type MotivationContext =
  'firstWeek' | 'streak' | 'comeback' | 'pr' | 'deload' | 'weekDone' | 'restDay' | 'trainingDay'

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 14) return 'morning'
  if (hour >= 14 && hour < 21) return 'afternoon'
  if (hour >= 21 || hour < 1) return 'evening'
  return 'night'
}

/** Hash FNV-1a de 32 bits: estable entre navegadores. */
export function hash(text: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function pickDaily<T>(items: readonly T[], date: string, context: string): T | undefined {
  if (items.length === 0) return undefined
  return items[hash(`${date}:${context}`) % items.length]
}

export interface MotivationInput {
  calibration: boolean
  deload: boolean
  streakWeeks: number
  daysSinceLastSession: number | null
  lastSessionHadPR: boolean
  weekDone: boolean
  trainingToday: boolean
}

/** Contexto más relevante, por prioridad. */
export function motivationContext(input: MotivationInput): MotivationContext {
  if (input.daysSinceLastSession !== null && input.daysSinceLastSession >= 10) return 'comeback'
  if (input.calibration) return 'firstWeek'
  if (input.weekDone) return 'weekDone'
  if (input.deload) return 'deload'
  if (input.lastSessionHadPR && (input.daysSinceLastSession ?? 99) <= 3) return 'pr'
  if (input.streakWeeks >= 2 && input.trainingToday) return 'streak'
  return input.trainingToday ? 'trainingDay' : 'restDay'
}
