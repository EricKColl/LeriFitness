/**
 * Derecho de supresión (RGPD art. 17): borra la cuenta y, en cascada, todos sus datos en la
 * nube (filas sincronizadas, uso del asistente y derechos). Los datos del dispositivo los borra
 * la app por separado.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

import { corsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return json({ error: 'auth' }, 401)
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) return json({ error: 'delete' }, 500)
  return json({ deleted: true })
})
