/**
 * Derecho de supresión (RGPD art. 17): borra la cuenta y, en cascada, todos sus datos en la
 * nube (filas sincronizadas, uso del asistente y derechos). Los datos del dispositivo los borra
 * la app por separado.
 */
import { adminClient, currentUser } from '../_shared/admin.ts'
import { corsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  const user = await currentUser(req)
  if (!user) return json({ error: 'auth' }, 401)
  const { error: deleteError } = await adminClient().auth.admin.deleteUser(user.id)
  if (deleteError) return json({ error: 'delete' }, 500)
  return json({ deleted: true })
})
