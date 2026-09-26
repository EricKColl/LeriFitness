import { describe, expect, it } from 'vitest'

import type { SessionLog } from '@/domain'
import { generatePlan } from '@/engine'
import { CATALOG, makeProfile } from '@/test/fixtures'

import { nextPlanDay, nextSessionWhen, weekSchedule } from './schedule'

const profile = makeProfile({ weekdays: [0, 2, 4] })
const plan = generatePlan({ profile, catalog: CATALOG })
const monday = '2026-09-21'

function done(dayId: string, date: string): SessionLog {
  return {
    id: `${dayId}-${date}`,
    dayId,
    planId: 'p',
    date,
    startedAt: 1,
    endedAt: 2,
    rpe: null,
    sets: [{ exerciseId: 'x', kg: 10, reps: 5, rir: 2, at: 1 }],
  }
}

describe('calendario semanal', () => {
  it('asigna los días del plan a los días elegidos', () => {
    const week = weekSchedule(plan, profile.weekdays, monday, [], '2026-09-23')
    expect(week.map((d) => d.planned?.id ?? null)).toEqual([
      plan.days[0]?.id,
      null,
      plan.days[1]?.id,
      null,
      plan.days[2]?.id,
      null,
      null,
    ])
    expect(week[2]?.isToday).toBe(true)
    expect(week[1]?.isPast).toBe(true)
  })

  it('la próxima sesión es el primer día sin hacer, aunque se entrene otro día', () => {
    const first = plan.days[0]!
    expect(nextPlanDay(plan, [])).toBe(first)
    const sessions = [done(first.id, '2026-09-22')]
    expect(nextPlanDay(plan, sessions)?.id).toBe(plan.days[1]?.id)
    const all = plan.days.map((d, i) => done(d.id, `2026-09-2${i + 1}`))
    expect(nextPlanDay(plan, all)).toBeNull()
  })

  it('decide si la sesión toca hoy, más tarde o si hoy ya se entrenó', () => {
    const second = plan.days[1]!
    // Martes: la del miércoles aún no toca.
    expect(nextSessionWhen(second, plan, profile.weekdays, monday, [], '2026-09-22')).toEqual({
      kind: 'later',
      date: '2026-09-23',
    })
    // Jueves con la del miércoles pendiente: toca hoy.
    expect(nextSessionWhen(second, plan, profile.weekdays, monday, [], '2026-09-24').kind).toBe(
      'today',
    )
    // Ya entrenó hoy: descanso.
    const today = [done(plan.days[0]!.id, '2026-09-24')]
    expect(nextSessionWhen(second, plan, profile.weekdays, monday, today, '2026-09-24').kind).toBe(
      'rest',
    )
  })
})
