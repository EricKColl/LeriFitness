/**
 * Ciclo de vida del plan: creación tras el onboarding, avance semana a semana (adaptación con la
 * adherencia, el esfuerzo y el check-in) y regeneración al editar el perfil.
 */
import type { CheckIn, Profile, SessionLog } from '@/domain'
import {
  advanceWeek,
  generatePlan,
  initialMesocycle,
  reviewWeek,
  type MesocycleState,
  type Reason,
} from '@/engine'
import { addDays, today, weeksBetween, weekStartOf } from '@/shared/lib/dates'

import type { Catalog } from './catalog'
import { db, type PlanRow, type ProfileRow } from './db'

/** Historial que usa el motor para progresar cargas (los últimos 6 meses bastan). */
const HISTORY_DAYS = 180

export function stripProfile(row: ProfileRow): Profile {
  const { id: _id, createdAt: _c, updatedAt: _u, ...profile } = row
  return profile
}

async function recentHistory(now: string): Promise<SessionLog[]> {
  return db.sessions.where('date').aboveOrEqual(addDays(now, -HISTORY_DAYS)).toArray()
}

async function weekSessions(weekStart: string) {
  return db.sessions.where('date').between(weekStart, addDays(weekStart, 7), true, false).toArray()
}

function buildRow(
  weekStart: string,
  profile: Profile,
  catalog: Catalog,
  mesocycle: MesocycleState,
  history: SessionLog[],
  checkIn: CheckIn | null,
  adaptation: Reason[],
): PlanRow {
  const createdAt = Date.now()
  return {
    id: `plan-${weekStart}-${createdAt}`,
    weekStart,
    createdAt,
    active: 1,
    mesocycle,
    adaptation,
    plan: generatePlan({ profile, catalog: catalog.exercises, history, mesocycle, checkIn }),
  }
}

async function activate(row: PlanRow) {
  await db.transaction('rw', db.plans, async () => {
    await db.plans.where('active').equals(1).modify({ active: 0 })
    await db.plans.put(row)
  })
  return row
}

export async function getActivePlan() {
  return db.plans.where('active').equals(1).first()
}

/** Primer plan, justo después del onboarding. */
export async function createFirstPlan(profile: Profile, catalog: Catalog, now = today()) {
  const row = buildRow(
    weekStartOf(now),
    profile,
    catalog,
    initialMesocycle(profile.level),
    await recentHistory(now),
    null,
    [],
  )
  return activate(row)
}

/**
 * Devuelve el plan de la semana actual; si el activo es de una semana anterior, avanza el
 * mesociclo con lo entrenado y genera el nuevo. Tras 2 o más semanas sin entrenar se empieza un
 * bloque nuevo desde la base («vuelta tras un parón»).
 */
export async function ensureCurrentPlan(catalog: Catalog, now = today()) {
  const [active, profileRow] = await Promise.all([getActivePlan(), db.profile.get('me')])
  if (!active || !profileRow) return null
  const current = weekStartOf(now)
  const gap = weeksBetween(active.weekStart, current)
  if (gap <= 0) return active

  const profile = stripProfile(profileRow)
  const history = await recentHistory(now)
  const checkIn = (await db.checkIns.get(addDays(current, -7))) ?? null
  const { mesocycle, reasons } = await nextMesocycle(active, profile, gap, history, checkIn)
  return activate(buildRow(current, profile, catalog, mesocycle, history, checkIn, reasons))
}

async function nextMesocycle(
  previous: PlanRow,
  profile: Profile,
  gap: number,
  history: SessionLog[],
  checkIn: CheckIn | null,
) {
  if (gap >= 3) {
    return {
      mesocycle: {
        ...initialMesocycle(profile.level),
        index: previous.mesocycle.index + 1,
        calibration: false,
      },
      reasons: [{ key: 'reasons.adapt.comeback', params: { weeks: gap - 1 } }],
    }
  }
  const trained = await weekSessions(previous.weekStart)
  let { next, reasons } = advanceWeek(
    previous.mesocycle,
    reviewWeek(previous.plan, trained, history, gap === 1 ? checkIn : null),
    profile.level,
  )
  // Una semana completa sin entrenar cuenta como adherencia 0.
  for (let i = 1; i < gap; i++) {
    const skipped = advanceWeek(
      next,
      {
        plannedSessions: previous.plan.days.length,
        completedSessions: 0,
        averageRpe: null,
        decliningLifts: 0,
        checkIn: i === gap - 1 ? checkIn : null,
      },
      profile.level,
    )
    next = skipped.next
    reasons = [...reasons, ...skipped.reasons]
  }
  return { mesocycle: next, reasons }
}

/** Tras editar el perfil: nuevo plan para esta semana conservando el punto del mesociclo. */
export async function regeneratePlan(profile: Profile, catalog: Catalog, now = today()) {
  const active = await getActivePlan()
  const current = weekStartOf(now)
  const mesocycle =
    active && active.plan.level === profile.level
      ? active.mesocycle
      : { ...initialMesocycle(profile.level), calibration: !active }
  const checkIn = (await db.checkIns.get(addDays(current, -7))) ?? null
  return activate(
    buildRow(current, profile, catalog, mesocycle, await recentHistory(now), checkIn, [
      { key: 'reasons.adapt.profileChanged' },
    ]),
  )
}

/**
 * Guarda el check-in de la semana pasada y, si aún no has entrenado esta semana, rehace el plan
 * actual teniendo en cuenta cómo llegas (fatiga y molestias).
 */
export async function applyCheckIn(checkIn: CheckIn, catalog: Catalog, now = today()) {
  await db.checkIns.put(checkIn)
  const current = weekStartOf(now)
  if (checkIn.weekStart !== addDays(current, -7)) return getActivePlan()
  const [active, profileRow, trainedThisWeek] = await Promise.all([
    getActivePlan(),
    db.profile.get('me'),
    weekSessions(current),
  ])
  if (!active || !profileRow || trainedThisWeek.length > 0) return active
  const previous = await db.plans.where('weekStart').equals(checkIn.weekStart).last()
  if (!previous) return active
  const profile = stripProfile(profileRow)
  const history = await recentHistory(now)
  const { mesocycle, reasons } = await nextMesocycle(previous, profile, 1, history, checkIn)
  return activate(buildRow(current, profile, catalog, mesocycle, history, checkIn, reasons))
}
