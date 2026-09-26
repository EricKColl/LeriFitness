/**
 * Herramientas solo de desarrollo (no llegan a producción): `window.forjaDev.seed()` crea un perfil
 * con varias semanas de historial realista para probar pantallas y hacer capturas.
 */
import { EQUIPMENT_PRESETS, type Profile, type SessionLog } from '@/domain'
import { generatePlan, initialMesocycle } from '@/engine'
import { loadCatalog } from '@/data/catalog'
import { db } from '@/data/db'
import { ensureCurrentPlan } from '@/data/plans'
import { recordConsent, saveProfile } from '@/data/profile'
import { syncAchievements } from '@/features/achievements/sync'
import { addDays, fromISODate, today, weekStartOf } from '@/shared/lib/dates'

interface SeedOptions {
  /** Semanas de historial antes de la actual. */
  weeks?: number
  /** Sesiones hechas en la semana actual. */
  thisWeek?: number
  markSeen?: boolean
}

async function seed({ weeks = 3, thisWeek = 1, markSeen = true }: SeedOptions = {}) {
  await db.delete()
  await db.open()
  const catalog = await loadCatalog()
  const profile: Profile = {
    goal: 'hypertrophy',
    level: 'intermediate',
    sex: 'female',
    age: 32,
    heightCm: 168,
    weightKg: 63,
    job: 'sedentary',
    weekdays: [0, 2, 4],
    minutesPerSession: 60,
    equipment: [...EQUIPMENT_PRESETS.fullGym],
    injuries: [{ zone: 'lowerBack', severity: 'mild' }],
  }
  await recordConsent('terms', true)
  await recordConsent('health', true)
  const now = today()
  const current = weekStartOf(now)
  const sessions: SessionLog[] = []
  for (let w = weeks; w >= 0; w--) {
    const weekStart = addDays(current, -7 * w)
    const plan = generatePlan({
      profile: profile,
      catalog: catalog.exercises,
      history: sessions,
      mesocycle: {
        ...initialMesocycle('intermediate'),
        week: weeks - w + 1,
        calibration: w === weeks,
      },
    })
    const planId = `plan-${weekStart}-seed`
    await db.plans.put({
      id: planId,
      weekStart,
      createdAt: fromISODate(weekStart).getTime(),
      active: 0,
      plan,
      mesocycle: plan.mesocycle,
      adaptation: [],
    })
    const count = w === 0 ? thisWeek : plan.days.length
    plan.days.slice(0, count).forEach((day, i) => {
      const date = addDays(weekStart, profile.weekdays[i] ?? i)
      if (date > now) return
      const start = fromISODate(date).getTime() + (i === 0 ? 7 : 18) * 3_600_000 - 12 * 3_600_000
      let at = start
      const sets = day.prescriptions.flatMap((p) =>
        Array.from({ length: p.sets }, (_, s) => {
          at += 150_000
          const base = p.loadKg ?? (p.role === 'main' ? 40 : 12)
          return {
            exerciseId: p.exerciseId,
            kg: p.unit === 'seconds' ? null : base + (weeks - w) * 2.5,
            reps: p.reps.max - s,
            rir: 2,
            at,
          }
        }),
      )
      sessions.push({
        id: `seed-${date}`,
        dayId: day.id,
        planId,
        date,
        startedAt: start,
        endedAt: at + 60_000,
        sets,
        rpe: 7,
      })
    })
  }
  await db.sessions.bulkPut(sessions)
  await db.plans.where('weekStart').equals(current).delete()
  await saveProfile(profile)
  // El plan de la semana pasada pasa a activo y se avanza como lo haría la app.
  const last = await db.plans.orderBy('weekStart').last()
  if (last) await db.plans.update(last.id, { active: 1 })
  await ensureCurrentPlan(catalog)
  await db.measurements.bulkPut(
    Array.from({ length: 6 }, (_, i) => ({
      id: `m-${i}`,
      date: addDays(current, -7 * (5 - i)),
      weightKg: 64.2 - i * 0.25,
      waistCm: 72 - i * 0.3,
    })),
  )
  await syncAchievements()
  if (markSeen) await db.achievements.toCollection().modify({ seen: true })
  return sessions.length
}

declare global {
  interface Window {
    forjaDev?: { seed: typeof seed; db: typeof db }
  }
}

window.forjaDev = { seed, db }
