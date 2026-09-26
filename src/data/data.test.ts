import { beforeEach, describe, expect, it } from 'vitest'

import { generatePlan } from '@/engine'
import { CATALOG, makeProfile, makeSession } from '@/test/fixtures'

import { exportAll, importAll, ImportError, parseExport, wipeAll } from './backup'
import type { Catalog } from './catalog'
import { db } from './db'
import { applyCheckIn, createFirstPlan, ensureCurrentPlan, getActivePlan } from './plans'
import { hasConsent, recordConsent, revokeHealthConsent, saveProfile } from './profile'

const catalog: Catalog = {
  exercises: CATALOG,
  byId: new Map(CATALOG.map((e) => [e.id, e])),
  content: {},
  version: '1',
}

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

describe('perfil y consentimientos', () => {
  it('guarda el perfil y conserva la fecha de creación', async () => {
    const first = await saveProfile(makeProfile())
    const second = await saveProfile(makeProfile({ weightKg: 70 }))
    expect(second.createdAt).toBe(first.createdAt)
    expect((await db.profile.get('me'))?.weightKg).toBe(70)
  })

  it('registra consentimientos con versión y permite retirarlos', async () => {
    await saveProfile(makeProfile({ injuries: [{ zone: 'knee', severity: 'mild' }] }))
    await recordConsent('health', true)
    expect(await hasConsent('health')).toBe(true)
    await db.checkIns.put({
      weekStart: '2026-09-14',
      energy: 3,
      sleep: 3,
      soreness: 3,
      pain: ['knee'],
    })
    const updated = await revokeHealthConsent()
    expect(updated?.injuries).toEqual([])
    expect(await hasConsent('health')).toBe(false)
    expect(await db.checkIns.count()).toBe(0)
  })
})

describe('ciclo de vida del plan', () => {
  it('crea el primer plan en el lunes de la semana actual', async () => {
    const profile = makeProfile()
    await saveProfile(profile)
    const row = await createFirstPlan(profile, catalog, '2026-09-24')
    expect(row.weekStart).toBe('2026-09-21')
    expect(row.plan.weekKind).toBe('calibration')
    expect((await getActivePlan())?.id).toBe(row.id)
  })

  it('en la misma semana devuelve el mismo plan', async () => {
    const profile = makeProfile()
    await saveProfile(profile)
    const row = await createFirstPlan(profile, catalog, '2026-09-21')
    expect((await ensureCurrentPlan(catalog, '2026-09-27'))?.id).toBe(row.id)
  })

  it('al cambiar de semana avanza el mesociclo con lo entrenado', async () => {
    const profile = makeProfile()
    await saveProfile(profile)
    const first = await createFirstPlan(profile, catalog, '2026-09-21')
    for (const [i, day] of first.plan.days.entries()) {
      const p = day.prescriptions[0]!
      const start = new Date(2026, 8, 21 + i * 2, 18).getTime()
      await db.sessions.put({
        ...makeSession(p.exerciseId, [{ kg: 50, reps: p.reps.max, rir: 2 }], start),
        date: `2026-09-${String(21 + i * 2).padStart(2, '0')}`,
        dayId: day.id,
        planId: first.id,
        rpe: 7,
      })
    }
    const next = await ensureCurrentPlan(catalog, '2026-09-29')
    expect(next?.weekStart).toBe('2026-09-28')
    expect(next?.mesocycle).toMatchObject({ week: 2, volumeStep: 1, calibration: false })
    expect(next?.adaptation[0]?.key).toBe('reasons.adapt.increase')
    expect(await db.plans.where('active').equals(1).count()).toBe(1)
  })

  it('tras un parón largo empieza un bloque nuevo', async () => {
    const profile = makeProfile()
    await saveProfile(profile)
    await createFirstPlan(profile, catalog, '2026-09-01')
    const next = await ensureCurrentPlan(catalog, '2026-09-26')
    expect(next?.mesocycle).toMatchObject({ index: 2, week: 1, volumeStep: 0 })
    expect(next?.adaptation[0]?.key).toBe('reasons.adapt.comeback')
  })

  it('el check-in con molestias rehace el plan de la semana si aún no has entrenado', async () => {
    const profile = makeProfile()
    await saveProfile(profile)
    await createFirstPlan(profile, catalog, '2026-09-21')
    await ensureCurrentPlan(catalog, '2026-09-28')
    const updated = await applyCheckIn(
      { weekStart: '2026-09-21', energy: 4, sleep: 4, soreness: 2, pain: ['elbow'] },
      catalog,
      '2026-09-28',
    )
    expect(updated?.plan.restrictions).toContainEqual({ zone: 'elbow', severity: 'mild' })
  })
})

describe('exportar, importar y borrar', () => {
  it('ida y vuelta de todos los datos', async () => {
    const profile = makeProfile()
    await saveProfile(profile)
    await recordConsent('health', true)
    await createFirstPlan(profile, catalog, '2026-09-21')
    await db.sessions.put(makeSession('pushups', [{ kg: null, reps: 12 }], Date.UTC(2026, 8, 22)))
    await db.measurements.put({ id: 'm1', date: '2026-09-22', weightKg: 64.5, waistCm: 72 })
    const exported = await exportAll()
    const text = JSON.stringify(exported)

    await wipeAll()
    await db.open()
    expect(await db.profile.count()).toBe(0)

    await importAll(text)
    expect(await db.profile.get('me')).toMatchObject({ weightKg: profile.weightKg })
    expect(await db.sessions.count()).toBe(1)
    expect(await db.measurements.get('m1')).toMatchObject({ weightKg: 64.5 })
    expect(await getActivePlan()).toBeDefined()
  })

  it('rechaza archivos que no son de Forja o están dañados', () => {
    expect(() => parseExport('{')).toThrow(ImportError)
    expect(() => parseExport(JSON.stringify({ app: 'otra' }))).toThrow(ImportError)
    const bad = (data: object) =>
      JSON.stringify({ app: 'forja', format: 1, exportedAt: new Date().toISOString(), data })
    expect(() =>
      parseExport(bad({ measurements: [{ id: 'x', date: 'ayer', weightKg: 2 }] })),
    ).toThrow(/measurements/)
    const plan = generatePlan({ catalog: CATALOG, profile: makeProfile() })
    expect(() => parseExport(bad({ plans: [{ plan }] }))).toThrow(/plans/)
  })
})
