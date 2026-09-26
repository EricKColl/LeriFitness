import { db } from '@/data/db'
import { stripProfile } from '@/data/plans'
import { today, weekStartOf } from '@/shared/lib/dates'

import { achievementStats, earnedAchievements } from './definitions'

export async function loadAchievementStats() {
  const [sessions, plans, checkIns, measurements, profile] = await Promise.all([
    db.sessions.toArray(),
    db.plans.orderBy('createdAt').toArray(),
    db.checkIns.count(),
    db.measurements.count(),
    db.profile.get('me'),
  ])
  return achievementStats({
    sessions,
    plans: plans.map((p) => ({
      id: p.id,
      weekStart: p.weekStart,
      days: p.plan.days.length,
      deload: p.plan.weekKind === 'deload',
    })),
    checkIns,
    measurements,
    weeklyTarget: profile ? stripProfile(profile).weekdays.length : 3,
    currentWeek: weekStartOf(today()),
  })
}

/** Guarda los logros recién conseguidos (sin ver) y devuelve sus ids. */
export async function syncAchievements() {
  const earned = earnedAchievements(await loadAchievementStats())
  const existing = new Set((await db.achievements.toArray()).map((a) => a.id))
  const fresh = earned.filter((id) => !existing.has(id))
  const now = Date.now()
  await db.achievements.bulkPut(fresh.map((id) => ({ id, unlockedAt: now, seen: false })))
  return fresh
}

export async function markAchievementsSeen(ids: readonly string[]) {
  await db.achievements.bulkUpdate(ids.map((id) => ({ key: id, changes: { seen: true } })))
}
