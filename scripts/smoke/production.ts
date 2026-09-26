/**
 * Comprobación de producción (la ejecuta el workflow «Comprobación»). No modifica nada que
 * quede: usa un usuario temporal que se borra al final (también si algo falla).
 *
 *   1. Web publicada: página, rutas de la SPA, cabeceras de seguridad y caché, modelo 3D,
 *      imágenes y service worker.
 *   2. Supabase: RLS (sin sesión no se lee ni se escribe nada), sesión con un usuario temporal,
 *      sincronización de filas propias, asistente en la nube (Gemini) y borrado de la cuenta
 *      con sus datos en cascada.
 *
 * Variables: APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY y, para revisar la
 * configuración de Auth, SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_REF (opcionales las de
 * Supabase: sin ellas solo se comprueba la web).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const results: { name: string; ok: boolean; detail?: string }[] = []

async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const detail = await fn()
    results.push({ name, ok: true, detail: detail ?? undefined })
  } catch (error) {
    results.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

/** Llama a una Edge Function y, si falla, lanza un error con el estado y el cuerpo. */
async function invoke<T>(
  client: { functions: Pick<SupabaseClient['functions'], 'invoke'> },
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await client.functions.invoke<T>(name, { body })
  const failure: unknown = response.error
  if (failure) {
    const { message, context } = failure as { message?: string; context?: Response }
    const text = context ? await context.text().catch(() => '') : ''
    throw new Error(`${message ?? 'error'} ${context?.status ?? ''} ${text}`.trim())
  }
  return response.data as T
}

const env = (name: string) => (process.env[name] ?? '').trim().replace(/\/+$/, '')

async function checkWeb(appUrl: string) {
  await check('Web: la página principal responde', async () => {
    const res = await fetch(appUrl)
    assert(res.ok, `estado ${res.status}`)
    const html = await res.text()
    assert(html.includes('<div id="root">'), 'no es la app')
    assert(!/<script>/.test(html), 'hay scripts en línea')
  })
  await check('Web: las rutas de la app funcionan (SPA)', async () => {
    for (const path of ['/hoy', '/ejercicios/barbell-squat', '/legal/privacidad']) {
      const res = await fetch(appUrl + path)
      assert(res.ok, `${path}: estado ${res.status}`)
    }
  })
  await check('Web: cabeceras de seguridad', async () => {
    const res = await fetch(appUrl)
    const csp = res.headers.get('content-security-policy') ?? ''
    assert(csp.includes("default-src 'self'"), 'falta la CSP')
    assert(csp.includes('supabase.co'), 'la CSP no permite Supabase')
    assert(res.headers.get('x-content-type-options') === 'nosniff', 'falta nosniff')
    assert(res.headers.get('x-frame-options') === 'DENY', 'falta X-Frame-Options')
  })
  await check('Web: el service worker no se cachea', async () => {
    const res = await fetch(`${appUrl}/sw.js`)
    assert(res.ok, `estado ${res.status}`)
    assert((res.headers.get('cache-control') ?? '').includes('no-cache'), 'sw.js se cachea')
  })
  await check('Web: modelo 3D y licencia publicados', async () => {
    const glb = await fetch(`${appUrl}/anatomy/body.glb`)
    assert(glb.ok, `body.glb: estado ${glb.status}`)
    const bytes = (await glb.arrayBuffer()).byteLength
    assert(bytes > 300_000, `body.glb demasiado pequeño (${bytes} bytes)`)
    const license = await fetch(`${appUrl}/anatomy/LICENSE.txt`)
    assert(license.ok, 'falta LICENSE.txt')
    return `${Math.round(bytes / 1024)} KB`
  })
  await check('Web: imágenes de ejercicios', async () => {
    const res = await fetch(`${appUrl}/exercises/barbell-squat/0.webp`)
    assert(res.ok, `estado ${res.status}`)
    assert((res.headers.get('content-type') ?? '').includes('image/webp'), 'no es webp')
  })
}

async function checkSupabase(url: string, anonKey: string, serviceKey: string) {
  const anon = createClient(url, anonKey, { auth: { persistSession: false } })
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  await check('Supabase: sin sesión no se ven datos (RLS)', async () => {
    const { data, error } = await anon.from('sync_rows').select('id').limit(1)
    assert(!error, error?.message ?? '')
    assert(Array.isArray(data) && data.length === 0, 'se ven filas sin sesión')
  })
  await check('Supabase: sin sesión no se puede escribir (RLS)', async () => {
    const { error } = await anon
      .from('sync_rows')
      .insert({ collection: 'sessions', id: 'smoke', data: {} })
    assert(error, 'se pudo escribir sin sesión')
  })
  await check('Supabase: los derechos premium no se pueden escribir desde la app', async () => {
    const { error } = await anon.from('entitlements').insert({ user_id: crypto.randomUUID() })
    assert(error, 'se pudo escribir en entitlements')
  })

  const email = `forja-smoke-${Date.now()}@example.com`
  const password = `Smoke-${crypto.randomUUID()}`
  let userId: string | null = null
  try {
    await check('Supabase: crear usuario temporal', async () => {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      assert(!error && data.user, error?.message ?? 'sin usuario')
      userId = data.user.id
    })
    if (!userId) return

    const user = createClient(url, anonKey, { auth: { persistSession: false } })
    await check('Supabase: iniciar sesión', async () => {
      const { error } = await user.auth.signInWithPassword({ email, password })
      assert(!error, error?.message ?? '')
    })

    await check('Supabase: sincronizar filas propias', async () => {
      const { error } = await user
        .from('sync_rows')
        .upsert(
          { collection: 'sessions', id: 'smoke-1', data: { ok: true }, deleted: false },
          { onConflict: 'user_id,collection,id' },
        )
      assert(!error, error?.message ?? '')
      const { data, error: readError } = await user.from('sync_rows').select('id, updated_at')
      assert(!readError, readError?.message ?? '')
      assert(data?.length === 1 && data[0]?.updated_at, 'no se lee la fila propia')
    })

    await check('Supabase: la colección de salud está prohibida', async () => {
      const { error } = await user
        .from('sync_rows')
        .insert({ collection: 'checkIns', id: 'x', data: {} })
      assert(error, 'se aceptó una colección no permitida')
    })

    await check('Supabase: asistente en la nube (Gemini)', async () => {
      const data = await invoke<{ answer: string; remaining: number }>(user, 'assistant', {
        question: '¿Qué es el RIR?',
        context: 'Objetivo: ganar músculo.',
        history: [],
      })
      assert(data?.answer && data.answer.length > 20, 'respuesta vacía')
      return `respuesta de ${data.answer.length} caracteres; quedan ${data.remaining} hoy`
    })

    await check('Supabase: el asistente rechaza llamadas sin sesión', async () => {
      const res = await fetch(`${url}/functions/v1/assistant`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'hola' }),
      })
      assert(res.status === 401, `estado ${res.status}`)
    })

    await check('Supabase: borrar la cuenta borra sus datos', async () => {
      await invoke(user, 'delete-account', {})
      const { data } = await admin.auth.admin.getUserById(userId!)
      assert(!data.user, 'el usuario sigue existiendo')
      const { count } = await admin
        .from('sync_rows')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId!)
      assert(count === 0, `quedan ${count} filas`)
      userId = null
    })
  } finally {
    // Limpieza: nunca se deja el usuario temporal.
    if (userId) await admin.auth.admin.deleteUser(userId).catch(() => undefined)
  }
}

/** Configuración de Auth (API de gestión): la URL del sitio y las de redirección. */
async function checkAuthConfig(appUrl: string, token: string, ref: string) {
  await check('Supabase: URLs de inicio de sesión apuntan a la app', async () => {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert(res.ok, `estado ${res.status}`)
    const config = (await res.json()) as { site_url?: string; uri_allow_list?: string }
    const site = (config.site_url ?? '').replace(/\/+$/, '')
    const allowed = (config.uri_allow_list ?? '').split(',').map((u) => u.trim())
    assert(site === appUrl, `Site URL es «${site || '(vacía)'}» y debería ser ${appUrl}`)
    assert(
      allowed.some((u) => u.startsWith(appUrl)),
      `Redirect URLs no incluye ${appUrl}/** (tiene: ${allowed.filter(Boolean).join(', ') || 'ninguna'})`,
    )
  })
}

/** Clave de Gemini: válida, con el modelo configurado disponible y con cuota para responder. */
async function checkGemini(key: string, model: string) {
  const base = 'https://generativelanguage.googleapis.com/v1beta'
  const headers = { 'x-goog-api-key': key, 'Content-Type': 'application/json' }
  let available: string[] = []
  await check('Gemini: la clave es válida', async () => {
    const res = await fetch(`${base}/models?pageSize=200`, { headers })
    const body = (await res.json().catch(() => ({}))) as {
      models?: { name: string; supportedGenerationMethods?: string[] }[]
      error?: { message?: string; status?: string }
    }
    assert(res.ok, `estado ${res.status}: ${body.error?.status ?? ''} ${body.error?.message ?? ''}`)
    available = (body.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name.replace('models/', ''))
    return `${available.length} modelos disponibles`
  })
  if (!available.length) return
  await check(`Gemini: el modelo ${model} está disponible`, async () => {
    const flash = available.filter((m) => m.includes('flash')).slice(0, 8)
    assert(available.includes(model), `no está; modelos «flash» disponibles: ${flash.join(', ')}`)
  })
  await check('Gemini: responde con la cuota gratuita', async () => {
    const res = await fetch(`${base}/models/${model}:generateContent`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Di «hola».' }] }] }),
    })
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; status?: string }
    }
    assert(res.ok, `estado ${res.status}: ${body.error?.status ?? ''} ${body.error?.message ?? ''}`)
  })
}

const appUrl = env('APP_URL')
if (appUrl) await checkWeb(appUrl)
const [url, anonKey, serviceKey] = [
  env('SUPABASE_URL'),
  env('SUPABASE_ANON_KEY'),
  env('SUPABASE_SERVICE_KEY'),
]
const gemini = env('GEMINI_API_KEY')
if (gemini) await checkGemini(gemini, env('GEMINI_MODEL') || 'gemini-2.5-flash-lite')
const [accessToken, ref] = [env('SUPABASE_ACCESS_TOKEN'), env('SUPABASE_PROJECT_REF')]
if (appUrl && accessToken && ref) await checkAuthConfig(appUrl, accessToken, ref)
if (url && anonKey && serviceKey) await checkSupabase(url, anonKey, serviceKey)
else results.push({ name: 'Supabase', ok: true, detail: 'sin configurar: se omite' })

for (const r of results)
  console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
const summary = results
  .map((r) => `| ${r.ok ? '✅' : '❌'} | ${r.name} | ${r.detail ?? ''} |`)
  .join('\n')
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs')
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Comprobación de producción\n\n| | Prueba | Detalle |\n|---|---|---|\n${summary}\n`,
  )
}
if (results.some((r) => !r.ok)) process.exit(1)
