/**
 * Nube opcional (Supabase, región UE). Si no hay configuración, la app funciona igual en modo
 * local: nada de esto se carga. El cliente se importa de forma perezosa.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const CLOUD = {
  url: import.meta.env.VITE_SUPABASE_URL ?? '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
}

export function cloudConfigured() {
  return CLOUD.url.startsWith('https://') && CLOUD.anonKey.length > 20
}

let client: Promise<SupabaseClient> | null = null

export function getClient() {
  if (!cloudConfigured()) throw new Error('La nube no está configurada')
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(CLOUD.url, CLOUD.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'forja-auth' },
    }),
  )
  return client
}
