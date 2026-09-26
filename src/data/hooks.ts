/**
 * Consultas reactivas a la base local: se actualizan solas al cambiar los datos (también desde otra
 * pestaña). `undefined` significa «cargando»; `null`, «no existe».
 */
import { useLiveQuery } from 'dexie-react-hooks'

import { addDays } from '@/shared/lib/dates'

import { db } from './db'
import { getActivePlan, stripProfile } from './plans'
import { hasConsent } from './profile'

export function useProfile() {
  return useLiveQuery(async () => {
    const row = await db.profile.get('me')
    return row ? stripProfile(row) : null
  }, [])
}

export function useActivePlan() {
  return useLiveQuery(async () => (await getActivePlan()) ?? null, [])
}

/** Sesiones terminadas o no, más recientes primero. */
export function useSessions() {
  return useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), [])
}

export function useWeekSessions(weekStart: string) {
  return useLiveQuery(
    () =>
      db.sessions.where('date').between(weekStart, addDays(weekStart, 7), true, false).toArray(),
    [weekStart],
  )
}

export function useActiveSession() {
  return useLiveQuery(async () => (await db.activeSession.get('current')) ?? null, [])
}

export function useCheckIn(weekStart: string) {
  return useLiveQuery(async () => (await db.checkIns.get(weekStart)) ?? null, [weekStart])
}

export function useMeasurements() {
  return useLiveQuery(() => db.measurements.orderBy('date').toArray(), [])
}

export function useAchievements() {
  return useLiveQuery(() => db.achievements.toArray(), [])
}

export function useHealthConsent() {
  return useLiveQuery(async () => hasConsent('health'), [])
}

export function usePlanExists(weekStart: string) {
  return useLiveQuery(
    async () => (await db.plans.where('weekStart').equals(weekStart).count()) > 0,
    [weekStart],
  )
}
