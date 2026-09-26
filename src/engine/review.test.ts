import { describe, expect, it } from 'vitest'

import { CATALOG, makeProfile, makeSession } from '@/test/fixtures'

import { generatePlan } from './generate'
import { reviewWeek } from './review'

describe('reviewWeek', () => {
  const plan = generatePlan({ catalog: CATALOG, profile: makeProfile() })
  const main = plan.days[0]!.prescriptions[0]!.exerciseId
  const t0 = Date.UTC(2026, 8, 21)

  it('calcula adherencia y RPE medio con las sesiones terminadas', () => {
    const sessions = [
      makeSession(main, [{ kg: 60, reps: 8 }], t0, { rpe: 7 }),
      makeSession(main, [{ kg: 60, reps: 8 }], t0 + 86_400_000, { rpe: 9 }),
      makeSession(main, [], t0 + 2 * 86_400_000, { endedAt: null }),
    ]
    const r = reviewWeek(plan, sessions, sessions, null)
    expect(r.plannedSessions).toBe(plan.days.length)
    expect(r.completedSessions).toBe(2)
    expect(r.averageRpe).toBe(8)
    expect(r.decliningLifts).toBe(0)
  })

  it('cuenta los principales cuyo rendimiento cae', () => {
    const history = [8, 6, 4].map((reps, i) =>
      makeSession(main, [{ kg: 80, reps }], t0 + i * 3 * 86_400_000),
    )
    expect(reviewWeek(plan, [], history, null).decliningLifts).toBe(1)
  })
})
