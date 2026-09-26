/**
 * Logros: reglas puras sobre el historial. Se evalúan tras cada sesión (y al abrir la app) y los
 * nuevos se guardan con `seen: false` para celebrarlos una vez.
 */
import type { SessionLog } from '@/domain'
import { estimate1RM } from '@/engine'
import { daysBetween, weekStartOf } from '@/shared/lib/dates'

import { isFinished, sessionTonnage, streakWeeks, workSets } from '../progress/stats'

export const TIERS = ['bronze', 'silver', 'gold', 'damascus'] as const
export type Tier = (typeof TIERS)[number]

export const ACHIEVEMENT_ICONS = [
  'flame',
  'calendar',
  'trophy',
  'weight',
  'sunrise',
  'moon',
  'compass',
  'check',
  'feather',
  'ruler',
  'rotate',
  'target',
] as const
export type AchievementIcon = (typeof ACHIEVEMENT_ICONS)[number]

export interface AchievementContext {
  sessions: readonly SessionLog[]
  /** Planes por semana (el último de cada semana): días previstos y si era de descarga. */
  plans: readonly { id: string; weekStart: string; days: number; deload: boolean }[]
  checkIns: number
  measurements: number
  weeklyTarget: number
  currentWeek: string
}

export interface AchievementDef {
  id: string
  tier: Tier
  icon: AchievementIcon
  /** Progreso actual y objetivo (para la barra en la pantalla de logros). */
  progress: (stats: AchievementStats) => { value: number; goal: number }
}

export interface AchievementStats {
  sessions: number
  bestStreak: number
  records: number
  tonnageKg: number
  distinctExercises: number
  completeWeeks: number
  deloadSessions: number
  earlySessions: number
  lateSessions: number
  comebacks: number
  checkIns: number
  measurements: number
}

const count =
  (key: keyof AchievementStats, goal: number): AchievementDef['progress'] =>
  (s) => ({ value: Math.min(s[key], goal), goal })

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'firstSession', tier: 'bronze', icon: 'flame', progress: count('sessions', 1) },
  { id: 'sessions10', tier: 'silver', icon: 'flame', progress: count('sessions', 10) },
  { id: 'sessions50', tier: 'gold', icon: 'flame', progress: count('sessions', 50) },
  { id: 'sessions150', tier: 'damascus', icon: 'flame', progress: count('sessions', 150) },
  { id: 'weekComplete', tier: 'bronze', icon: 'check', progress: count('completeWeeks', 1) },
  { id: 'streak4', tier: 'silver', icon: 'calendar', progress: count('bestStreak', 4) },
  { id: 'streak12', tier: 'gold', icon: 'calendar', progress: count('bestStreak', 12) },
  { id: 'streak26', tier: 'damascus', icon: 'calendar', progress: count('bestStreak', 26) },
  { id: 'firstRecord', tier: 'bronze', icon: 'trophy', progress: count('records', 1) },
  { id: 'records10', tier: 'silver', icon: 'trophy', progress: count('records', 10) },
  { id: 'records50', tier: 'gold', icon: 'trophy', progress: count('records', 50) },
  { id: 'tonnage10', tier: 'bronze', icon: 'weight', progress: count('tonnageKg', 10_000) },
  { id: 'tonnage100', tier: 'silver', icon: 'weight', progress: count('tonnageKg', 100_000) },
  { id: 'tonnage500', tier: 'gold', icon: 'weight', progress: count('tonnageKg', 500_000) },
  { id: 'tonnage1000', tier: 'damascus', icon: 'weight', progress: count('tonnageKg', 1_000_000) },
  { id: 'explorer', tier: 'silver', icon: 'compass', progress: count('distinctExercises', 25) },
  { id: 'deload', tier: 'silver', icon: 'feather', progress: count('deloadSessions', 1) },
  { id: 'earlyBird', tier: 'bronze', icon: 'sunrise', progress: count('earlySessions', 5) },
  { id: 'nightOwl', tier: 'bronze', icon: 'moon', progress: count('lateSessions', 5) },
  { id: 'comeback', tier: 'silver', icon: 'rotate', progress: count('comebacks', 1) },
  { id: 'checkIn', tier: 'bronze', icon: 'target', progress: count('checkIns', 1) },
  { id: 'measure', tier: 'bronze', icon: 'ruler', progress: count('measurements', 1) },
]

/** Número de récords (mejoras del e1RM de un ejercicio sobre su mejor marca previa). */
export function countRecords(sessions: readonly SessionLog[]) {
  const best = new Map<string, number>()
  let records = 0
  for (const session of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const sessionBest = new Map<string, number>()
    for (const set of workSets(session)) {
      if (!set.kg) continue
      const e1rm = estimate1RM(set.kg, set.reps, set.rir ?? 0)
      sessionBest.set(set.exerciseId, Math.max(sessionBest.get(set.exerciseId) ?? 0, e1rm))
    }
    for (const [id, e1rm] of sessionBest) {
      const previous = best.get(id)
      if (previous !== undefined && e1rm > previous + 0.01) records++
      if (previous === undefined || e1rm > previous) best.set(id, e1rm)
    }
  }
  return records
}

function bestStreak(sessions: readonly SessionLog[], weeklyTarget: number) {
  const weeks = [...new Set(sessions.map((s) => weekStartOf(s.date)))].sort()
  let best = 0
  for (const week of weeks) best = Math.max(best, streakWeeks(sessions, weeklyTarget, week))
  return best
}

export function achievementStats(ctx: AchievementContext): AchievementStats {
  const sessions = ctx.sessions.filter(isFinished).sort((a, b) => a.startedAt - b.startedAt)
  const plans = new Map(ctx.plans.map((p) => [p.id, p]))
  const lastPlanOfWeek = new Map<string, (typeof ctx.plans)[number]>()
  for (const p of ctx.plans) lastPlanOfWeek.set(p.weekStart, p)

  let completeWeeks = 0
  for (const [week, plan] of lastPlanOfWeek) {
    const days = new Set(sessions.filter((s) => weekStartOf(s.date) === week).map((s) => s.dayId))
    if (plan.days > 0 && days.size >= plan.days) completeWeeks++
  }

  let comebacks = 0
  for (let i = 1; i < sessions.length; i++)
    if (daysBetween(sessions[i - 1]!.date, sessions[i]!.date) >= 14) comebacks++

  const hour = (s: SessionLog) => new Date(s.startedAt).getHours()
  return {
    sessions: sessions.length,
    bestStreak: bestStreak(sessions, ctx.weeklyTarget),
    records: countRecords(sessions),
    tonnageKg: Math.round(sessions.reduce((sum, s) => sum + sessionTonnage(s), 0)),
    distinctExercises: new Set(sessions.flatMap((s) => workSets(s).map((w) => w.exerciseId))).size,
    completeWeeks,
    deloadSessions: sessions.filter((s) => plans.get(s.planId)?.deload).length,
    earlySessions: sessions.filter((s) => hour(s) >= 4 && hour(s) < 8).length,
    lateSessions: sessions.filter((s) => hour(s) >= 21 || hour(s) < 4).length,
    comebacks,
    checkIns: ctx.checkIns,
    measurements: ctx.measurements,
  }
}

export function earnedAchievements(stats: AchievementStats) {
  return ACHIEVEMENTS.filter((a) => {
    const { value, goal } = a.progress(stats)
    return value >= goal
  }).map((a) => a.id)
}
