import { beforeEach, describe, expect, it } from 'vitest'

import { makeProfile, makeSession } from '@/test/fixtures'

import { db } from '../db'
import { saveProfile } from '../profile'
import { computePush, stableStringify, sync, type RemoteRow, type RemoteStore } from './sync'

/** Servidor en memoria con reloj propio (como Supabase: la hora la pone el servidor). */
function memoryRemote() {
  const rows = new Map<string, Required<RemoteRow>>()
  let clock = 0
  const store: RemoteStore = {
    push: async (list) => {
      for (const r of list) {
        const updated_at = new Date(Date.UTC(2026, 0, 1, 0, 0, ++clock)).toISOString()
        rows.set(`${r.collection}/${r.id}`, { ...r, updated_at })
      }
      await Promise.resolve()
    },
    pull: async (since) => {
      await Promise.resolve()
      return [...rows.values()]
        .filter((r) => !since || r.updated_at > since)
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
    },
  }
  return { store, rows }
}

async function freshDevice() {
  db.close()
  await db.delete()
  await db.open()
}

const session = (id: string) => ({
  ...makeSession('barbell-squat', [{ kg: 60, reps: 8 }], 1_000),
  id,
  notes: 'Me molestó un poco la rodilla',
})

beforeEach(freshDevice)

describe('sincronización', () => {
  it('nunca sube lesiones ni notas', async () => {
    const { store, rows } = memoryRemote()
    await saveProfile(makeProfile({ injuries: [{ zone: 'knee', severity: 'moderate' }] }))
    await db.sessions.put(session('s1'))
    await db.checkIns.put({
      weekStart: '2026-09-14',
      energy: 3,
      sleep: 3,
      soreness: 2,
      pain: ['knee'],
    })
    await db.measurements.put({ id: 'm1', date: '2026-09-14', weightKg: 70 })

    const result = await sync(store)
    expect(result.pushed).toBe(2)
    const uploaded = JSON.stringify([...rows.values()])
    expect(uploaded).not.toContain('injuries')
    expect(uploaded).not.toContain('knee')
    expect(uploaded).not.toContain('rodilla')
    expect(uploaded).not.toContain('weightKg":70,"id":"m1')
    expect([...rows.keys()].sort()).toEqual(['profile/me', 'sessions/s1'])
  })

  it('lleva los datos a otro dispositivo sin pisar lo local de salud', async () => {
    const { store } = memoryRemote()
    await saveProfile(makeProfile({ goal: 'strength' }))
    await db.sessions.put(session('s1'))
    await sync(store)

    await freshDevice()
    await saveProfile(
      makeProfile({ goal: 'health', injuries: [{ zone: 'wrist', severity: 'mild' }] }),
    )
    await sync(store)
    // Gana lo que se sube después (este dispositivo), pero las lesiones siguen siendo locales.
    const profile = await db.profile.get('me')
    expect(profile?.injuries).toEqual([{ zone: 'wrist', severity: 'mild' }])
    expect(await db.sessions.get('s1')).toMatchObject({ id: 's1' })
    expect((await db.sessions.get('s1'))?.notes).toBeUndefined()
  })

  it('propaga borrados y no vuelve a subir lo que no ha cambiado', async () => {
    const { store, rows } = memoryRemote()
    await db.sessions.put(session('s1'))
    await db.sessions.put(session('s2'))
    await sync(store)
    expect((await sync(store)).pushed).toBe(0)

    await db.sessions.delete('s2')
    expect((await sync(store)).pushed).toBe(1)
    expect(rows.get('sessions/s2')?.deleted).toBe(true)

    await freshDevice()
    await sync(store)
    expect(await db.sessions.count()).toBe(1)
  })

  it('las sesiones en curso no se suben', async () => {
    const { rows, store } = memoryRemote()
    await db.sessions.put({ ...session('s1'), endedAt: null })
    await sync(store)
    expect(rows.size).toBe(0)
  })

  it('huellas estables e independientes del orden de las claves', () => {
    expect(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(
      stableStringify({ a: [2, { c: 2, d: 1 }], b: 1 }),
    )
    const local = new Map([
      ['sessions/x', { collection: 'sessions' as const, id: 'x', data: { a: 1 }, deleted: false }],
    ])
    expect(computePush(local, {}).upserts).toHaveLength(1)
    expect(computePush(new Map(), { 'sessions/y': 'h' }).deletes[0]).toMatchObject({
      id: 'y',
      deleted: true,
    })
  })
})
