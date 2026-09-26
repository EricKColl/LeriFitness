/**
 * Cuenta opcional: inicio de sesión sin contraseña (código de un solo uso por email),
 * sincronización con Supabase y borrado de la cuenta. Todo se carga de forma perezosa.
 */
import { useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'

import { recordConsent } from '../profile'
import { cloudConfigured, getClient } from './client'
import { resetSyncState, sync, type RemoteRow, type RemoteStore } from './sync'

export type AccountStatus = 'disabled' | 'loading' | 'signedOut' | 'signedIn'

interface AccountSnapshot {
  status: AccountStatus
  email: string | null
}

let snapshot: AccountSnapshot = {
  status: cloudConfigured() ? 'loading' : 'disabled',
  email: null,
}
const listeners = new Set<() => void>()
let started = false

function publish(session: Session | null) {
  snapshot = {
    status: session ? 'signedIn' : 'signedOut',
    email: session?.user.email ?? null,
  }
  listeners.forEach((l) => l())
}

function start() {
  if (started || !cloudConfigured()) return
  started = true
  void getClient().then(async (client) => {
    const { data } = await client.auth.getSession()
    publish(data.session)
    client.auth.onAuthStateChange((_event, session) => publish(session))
  })
}

export function useAccount() {
  return useSyncExternalStore(
    (listener) => {
      start()
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => snapshot,
  )
}

export async function sendCode(email: string) {
  const client = await getClient()
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${location.origin}/perfil/cuenta` },
  })
  if (error) throw error
}

export async function verifyCode(email: string, token: string) {
  const client = await getClient()
  const { error } = await client.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
  await recordConsent('cloud', true)
}

export async function signOut() {
  const client = await getClient()
  await client.auth.signOut()
  await resetSyncState()
}

/** Borra la cuenta y todos sus datos en la nube. Los datos del dispositivo se conservan. */
export async function deleteAccount() {
  const client = await getClient()
  const response = await client.functions.invoke('delete-account', { body: {} })
  if (response.error) throw new Error('delete-account')
  await client.auth.signOut()
  await resetSyncState()
  await recordConsent('cloud', false)
}

export async function fetchPlan(): Promise<'free' | 'premium'> {
  if (snapshot.status !== 'signedIn') return 'free'
  const client = await getClient()
  const response = await client.from('entitlements').select('plan, valid_until').maybeSingle()
  const row: { plan: string; valid_until: string | null } | null = response.data
  if (!row || row.plan !== 'premium') return 'free'
  return !row.valid_until || new Date(row.valid_until) > new Date() ? 'premium' : 'free'
}

function supabaseStore(): RemoteStore {
  return {
    async push(rows) {
      const client = await getClient()
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows
          .slice(i, i + 200)
          .map(({ collection, id, data, deleted }) => ({ collection, id, data, deleted }))
        const { error } = await client
          .from('sync_rows')
          .upsert(chunk, { onConflict: 'user_id,collection,id' })
        if (error) throw error
      }
    },
    async pull(since) {
      const client = await getClient()
      const all: RemoteRow[] = []
      let cursor = since
      for (;;) {
        let query = client
          .from('sync_rows')
          .select('collection, id, data, deleted, updated_at')
          .order('updated_at')
          .limit(1000)
        if (cursor) query = query.gt('updated_at', cursor)
        const { data, error } = await query
        if (error) throw error
        const page = (data ?? []) as RemoteRow[]
        all.push(...page)
        if (page.length < 1000) return all
        cursor = page[page.length - 1]?.updated_at ?? cursor
      }
    },
  }
}

let running: Promise<{ pushed: number; pulled: number }> | null = null

/** Sincroniza si hay sesión iniciada. Nunca lanza: los fallos se reintentan la próxima vez. */
export async function syncNow() {
  if (!cloudConfigured()) return null
  start()
  const client = await getClient()
  const { data } = await client.auth.getSession()
  if (!data.session) return null
  running ??= sync(supabaseStore()).finally(() => {
    running = null
  })
  return running
}
