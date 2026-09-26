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
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'forja-auth',
        // Enlace mágico por email: la sesión llega en el fragmento de la URL al abrirlo.
        flowType: 'implicit',
        detectSessionInUrl: true,
      },
    }),
  )
  return client
}

/** ¿La URL trae el resultado de un enlace de inicio de sesión (sesión o error)? */
export function authParamsIn(url: string) {
  const { hash } = new URL(url)
  return /(^|[#&])(access_token|error_description)=/.test(hash)
}
