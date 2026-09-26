/**
 * Asistente en el dispositivo con WebLLM (WebGPU). El modelo se descarga una vez (lo guarda
 * WebLLM en la Cache API del navegador) y después funciona sin conexión: las preguntas no salen
 * del dispositivo. La librería se importa de forma perezosa para no pesar en el resto de la app.
 */
import type { ChatCompletionMessageParam, MLCEngineInterface } from '@mlc-ai/web-llm'

export const LOCAL_MODELS = {
  // Qwen2.5 (Apache 2.0): buen español para su tamaño.
  quality: { id: 'Qwen2.5-1.5B-Instruct', approxMB: 1000 },
  light: { id: 'Qwen2.5-0.5B-Instruct', approxMB: 350 },
} as const
export type LocalModelSize = keyof typeof LOCAL_MODELS

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

let engine: { id: string; instance: MLCEngineInterface } | null = null

export async function loadModel(id: string, onProgress: (progress: number, text: string) => void) {
  if (engine?.id === id) return engine.instance
  const { CreateWebWorkerMLCEngine } = await import('./webllm')
  const worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' })
  const instance = await CreateWebWorkerMLCEngine(worker, id, {
    initProgressCallback: (report) => onProgress(report.progress, report.text),
  })
  engine = { id, instance }
  return instance
}

export function loadedModel() {
  return engine?.id ?? null
}

export async function unloadModel() {
  await engine?.instance.unload()
  engine = null
}

export async function* generate(
  messages: ChatCompletionMessageParam[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (!engine) throw new Error('Modelo no cargado')
  const stream = await engine.instance.chat.completions.create({
    messages,
    stream: true,
    temperature: 0.3,
    max_tokens: 400,
  })
  for await (const chunk of stream) {
    if (signal?.aborted) {
      engine.instance.interruptGenerate()
      return
    }
    yield chunk.choices[0]?.delta.content ?? ''
  }
}
