/**
 * MagicErick en la nube (la vía principal en móviles): una Edge Function de Supabase llama a
 * Gemini con una cuota diaria por persona. Solo se envía la pregunta y un contexto sin datos
 * personales ni de salud (ver `buildContext(…, 'remote')`).
 */
import { cloudConfigured, getClient } from '@/data/cloud/client'

export class RemoteError extends Error {
  reason: 'signedOut' | 'quota' | 'unavailable'
  constructor(reason: RemoteError['reason']) {
    super(reason)
    this.reason = reason
  }
}

export function remoteConfigured() {
  return cloudConfigured()
}

export interface RemoteAnswer {
  answer: string
  remaining: number
}

/** Sin respuesta en este tiempo → error (la red del móvil puede quedarse colgada). */
const TIMEOUT_MS = 30_000

export async function askRemote(
  question: string,
  context: string,
  history: { role: 'user' | 'assistant'; text: string }[],
  signal?: AbortSignal,
): Promise<RemoteAnswer> {
  const client = await getClient()
  const auth = await client.auth.getSession()
  if (!auth.data.session) throw new RemoteError('signedOut')
  const response = await client.functions.invoke<RemoteAnswer>('assistant', {
    body: { question, context, history: history.slice(-4) },
    timeout: TIMEOUT_MS,
    signal,
  })
  if (response.error) {
    const failure = response.error as unknown as { context?: { status?: number } }
    throw new RemoteError(failure.context?.status === 429 ? 'quota' : 'unavailable')
  }
  const data = response.data
  if (!data?.answer) throw new RemoteError('unavailable')
  return data
}
