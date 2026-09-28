/**
 * Asistente en la nube de Forja (respaldo cuando el dispositivo no puede ejecutar el modelo
 * local). Requiere sesión iniciada; aplica una cuota diaria por persona y llama a Gemini.
 *
 * Privacidad: la app solo envía la pregunta y un resumen del plan sin datos personales ni de
 * salud. Aquí no se guarda el contenido de las preguntas: solo se cuenta cuántas se hacen.
 *
 * Secretos (supabase secrets set …): GEMINI_API_KEY. Opcionales: GEMINI_MODEL,
 * DAILY_LIMIT_FREE, DAILY_LIMIT_PREMIUM, ALLOWED_ORIGIN.
 */
import { adminClient, currentUser } from '../_shared/admin.ts'
import { corsHeaders, json } from '../_shared/cors.ts'
import { SYSTEM_PROMPT } from '../_shared/prompt.ts'

// gemini-2.5-flash-lite ya no está disponible para cuentas nuevas (Google, septiembre de 2026).
const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite'
const LIMIT_FREE = Number(Deno.env.get('DAILY_LIMIT_FREE') ?? 15)
const LIMIT_PREMIUM = Number(Deno.env.get('DAILY_LIMIT_PREMIUM') ?? 60)
const TRANSIENT = new Set([500, 503])
const RETRY_WAITS_MS = [1000, 3000]

interface Body {
  question?: unknown
  context?: unknown
  history?: unknown
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'unconfigured' }, 503)

  // Identidad a partir del token de la sesión (lo verifica el servicio de autenticación).
  const user = await currentUser(req)
  if (!user) return json({ error: 'auth' }, 401)
  const userId = user.id
  const admin = adminClient()

  const body = (await req.json().catch(() => ({}))) as Body
  const question = clean(body.question, 500)
  const context = clean(body.context, 6000)
  if (!question) return json({ error: 'question' }, 400)
  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-4)
    .map((m: { role?: unknown; text?: unknown }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: clean(m.text, 1000) }],
    }))
    .filter((m) => m.parts[0]!.text)

  // Cuota diaria (atómica en la base de datos).
  const { data: entitlement } = await admin
    .from('entitlements')
    .select('plan, valid_until')
    .eq('user_id', userId)
    .maybeSingle()
  const premium =
    entitlement?.plan === 'premium' &&
    (!entitlement.valid_until || new Date(entitlement.valid_until) > new Date())
  const limit = premium ? LIMIT_PREMIUM : LIMIT_FREE
  const { data: used, error: quotaError } = await admin.rpc('consume_assistant_quota', {
    p_user: userId,
    p_limit: limit,
  })
  if (quotaError) return json({ error: 'quota' }, 500)
  if ((used as number) > limit) return json({ error: 'quota', remaining: 0 }, 429)

  const request = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}\n\nContexto:\n${context}` }] },
      contents: [...history, { role: 'user', parts: [{ text: question }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
    }),
  }
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  // Google devuelve 503 («high demand») o 500 en picos de uso pasajeros: se reintenta dos veces
  // con una espera corta antes de dar el error.
  let response = await fetch(endpoint, request)
  for (const wait of RETRY_WAITS_MS) {
    if (!TRANSIENT.has(response.status)) break
    await response.body?.cancel()
    await new Promise((resolve) => setTimeout(resolve, wait))
    response = await fetch(endpoint, request)
  }
  if (!response.ok) {
    // Solo el estado y el mensaje del proveedor (nunca la clave) para poder diagnosticar.
    const detail = (await response.json().catch(() => null)) as {
      error?: { message?: string }
    } | null
    return json({ error: 'upstream', status: response.status, detail: detail?.error?.message }, 502)
  }
  const result = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const answer = (result.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim()
  if (!answer) return json({ error: 'empty' }, 502)
  return json({ answer, remaining: Math.max(0, limit - (used as number)) })
})
