import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Cliente con permisos de servidor. Acepta la clave clásica (`SUPABASE_SERVICE_ROLE_KEY`) o las
 * claves secretas nuevas (`SUPABASE_SECRET_KEYS`, un JSON con nombre → clave).
 */
function serviceKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  const secrets = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (secrets) {
    try {
      const parsed = JSON.parse(secrets) as Record<string, string>
      const key = parsed.default ?? Object.values(parsed)[0]
      if (key) return key
    } catch {
      // Formato inesperado: se informa abajo.
    }
  }
  throw new Error('No hay clave de servidor disponible en la función')
}

export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Persona que llama, a partir del token de su sesión. La verificación la hace el propio
 * servicio de autenticación (funciona con las claves de firma clásicas y con las nuevas).
 */
export async function currentUser(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await adminClient().auth.getUser(token)
  return error ? null : data.user
}
