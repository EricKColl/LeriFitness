/**
 * MagicErick en el dispositivo con WebLLM (WebGPU). El modelo se descarga una vez (lo guarda
 * WebLLM en la Cache API del navegador) y después funciona sin conexión: las preguntas no salen
 * del dispositivo. La librería se importa de forma perezosa para no pesar en el resto de la app.
 *
 * Robustez: si la GPU se queda sin memoria, WebLLM puede dejar la petición colgada sin avisar.
 * Por eso la carga termina con una prueba de una palabra, la generación tiene límites de tiempo
 * y, si algo falla, se destruye el worker (libera la GPU) para responder por otra vía.
 */
import type { ChatCompletionMessageParam, MLCEngineInterface } from '@mlc-ai/web-llm'

import { aborted, guardStream, idleTimeout, isAbortError, withTimeout } from './watchdog'

export const LOCAL_MODELS = {
  // Qwen2.5 (Apache 2.0): buen español para su tamaño.
  quality: { id: 'Qwen2.5-1.5B-Instruct', approxMB: 1000 },
  light: { id: 'Qwen2.5-0.5B-Instruct', approxMB: 350 },
} as const
export type LocalModelSize = keyof typeof LOCAL_MODELS

/** Sin avance de la descarga o de la carga en la GPU durante este tiempo → error. */
const LOAD_IDLE_MS = 90_000
/** Prueba de arranque (una palabra) tras cargar. */
const WARMUP_MS = 30_000
/** Hasta la primera palabra de la respuesta (incluye leer el contexto del plan). */
const FIRST_TOKEN_MS = 45_000
/** Entre palabras. */
const NEXT_TOKEN_MS = 20_000

export interface GpuSupport {
  webgpu: boolean
  f16: boolean
}

export async function detectGpu(): Promise<GpuSupport> {
  const gpu = (
    navigator as Navigator & { gpu?: { requestAdapter: () => Promise<GPUAdapterLike | null> } }
  ).gpu
  if (!gpu) return { webgpu: false, f16: false }
  try {
    const adapter = await gpu.requestAdapter()
    return { webgpu: !!adapter, f16: !!adapter?.features.has('shader-f16') }
  } catch {
    return { webgpu: false, f16: false }
  }
}

interface GPUAdapterLike {
  features: { has: (name: string) => boolean }
}

/** Id del modelo en el catálogo de WebLLM (cuantización f16 si la GPU la admite). */
export function modelId(size: LocalModelSize, f16: boolean) {
  return `${LOCAL_MODELS[size].id}-${f16 ? 'q4f16_1' : 'q4f32_1'}-MLC`
}

export async function isModelCached(id: string) {
  const { hasModelInCache } = await import('./webllm')
  return hasModelInCache(id)
}

export async function deleteModel(id: string) {
  const { deleteModelAllInfoInCache } = await import('./webllm')
  await deleteModelAllInfoInCache(id)
}

interface LoadedEngine {
  id: string
  instance: MLCEngineInterface
  worker: Worker
  /** Falla si el worker cae (p. ej. el sistema lo cierra por falta de memoria). */
  crashed: Promise<never>
}

let engine: LoadedEngine | null = null
let loading: { id: string; promise: Promise<void> } | null = null

function watchWorker(worker: Worker): Promise<never> {
  const crashed = new Promise<never>((_, reject) => {
    worker.addEventListener('error', (event) =>
      reject(new Error(event.message || 'El modelo se ha detenido')),
    )
    worker.addEventListener('messageerror', () => reject(new Error('El modelo se ha detenido')))
  })
  crashed.catch(() => {})
  return crashed
}

export function loadModel(
  id: string,
  onProgress: (progress: number, text: string) => void,
): Promise<void> {
  if (engine?.id === id) return Promise.resolve()
  if (loading?.id === id) return loading.promise
  const promise = (async () => {
    resetLocal()
    const { CreateWebWorkerMLCEngine } = await import('./webllm')
    const worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' })
    const crashed = watchWorker(worker)
    const idle = idleTimeout(LOAD_IDLE_MS, 'carga del modelo')
    try {
      const instance = await Promise.race([
        CreateWebWorkerMLCEngine(worker, id, {
          initProgressCallback: (report) => {
            idle.kick()
            onProgress(report.progress, report.text)
          },
        }),
        idle.expired,
        crashed,
      ])
      // Prueba de arranque: si la GPU no da para el modelo, falla o se cuelga aquí y no en mitad
      // de una pregunta.
      await withTimeout(
        instance.chat.completions.create({
          messages: [{ role: 'user', content: 'Hola' }],
          max_tokens: 1,
        }),
        WARMUP_MS,
        'prueba del modelo',
        crashed,
      )
      engine = { id, instance, worker, crashed }
    } catch (error) {
      worker.terminate()
      throw error
    } finally {
      idle.stop()
    }
  })().finally(() => {
    loading = null
  })
  loading = { id, promise }
  return promise
}

export function loadedModel() {
  return engine?.id ?? null
}

/** Descarga el modelo de la GPU destruyendo su worker (funciona aunque esté colgado). */
export function resetLocal() {
  engine?.worker.terminate()
  engine = null
}

/**
 * Respuesta en fragmentos. Lanza `TimeoutError` si el modelo se cuelga (hay que llamar a
 * `resetLocal`) y termina sin error si se detiene con `signal`.
 */
export async function* generate(
  messages: ChatCompletionMessageParam[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const current = engine
  if (!current) throw new Error('Modelo no cargado')
  const stop = signal ? Promise.race([current.crashed, aborted(signal)]) : current.crashed
  stop.catch(() => {})
  try {
    const stream = await withTimeout(
      current.instance.chat.completions.create({
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 400,
      }),
      FIRST_TOKEN_MS,
      'inicio de la respuesta',
      stop,
    )
    for await (const chunk of guardStream(stream, {
      firstMs: FIRST_TOKEN_MS,
      idleMs: NEXT_TOKEN_MS,
      abort: stop,
    }))
      yield chunk.choices[0]?.delta.content ?? ''
  } catch (error) {
    if (!isAbortError(error)) throw error
    current.instance.interruptGenerate()
  }
}
