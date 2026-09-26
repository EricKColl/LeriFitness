/**
 * Qué responde a cada pregunta de MagicErick y cómo se prepara el modelo del dispositivo.
 *
 * Orden: modelo del dispositivo si está listo → IA en la nube si está activada → glosario (siempre
 * disponible, sin conexión). En móviles no se usa el modelo del dispositivo (ver `device.ts`).
 */
import { usePrefs } from '@/shared/stores/prefs'

import { deleteDownloadedModels, isMobileDevice } from './device'
import {
  deleteModel,
  detectGpu,
  isModelCached,
  loadedModel,
  loadModel,
  modelId,
  resetLocal,
  type LocalModelSize,
} from './local-llm'
import { useAssistant, type LocalStatus, type Source } from './store'

/** Estado de la IA en la nube para esta persona. */
export type CloudState = 'unconfigured' | 'signedOut' | 'off' | 'on'

export function pickEngine(local: LocalStatus, cloud: CloudState): Source {
  if (local === 'ready') return 'local'
  if (cloud === 'on') return 'remote'
  return 'glossary'
}

/** Cómo puede mejorar la respuesta (se sugiere en el chat cuando solo queda el glosario). */
export type EngineHint = 'progress' | 'enableCloud' | 'signIn' | 'download' | null

export function engineHint(local: LocalStatus, cloud: CloudState): EngineHint {
  if (pickEngine(local, cloud) !== 'glossary') return null
  if (local === 'loading' || local === 'downloading') return 'progress'
  if (cloud === 'off') return 'enableCloud'
  if (local === 'notDownloaded') return 'download'
  if (cloud === 'signedOut') return 'signIn'
  return null
}

const setState: ReturnType<typeof useAssistant.getState>['set'] = (patch) =>
  useAssistant.getState().set(patch)

let started = false
let f16 = true
let pending: Promise<void> | null = null

/** Comprueba el dispositivo y, si ya hay un modelo descargado, lo carga (una vez por sesión). */
export async function initEngine() {
  if (started) return
  started = true
  if (isMobileDevice()) return setState({ local: 'mobile' })
  const gpu = await detectGpu()
  f16 = gpu.f16
  if (!gpu.webgpu) return setState({ local: 'unsupported' })
  const { assistantModel, assistantLocalFailed } = usePrefs.getState()
  if (assistantModel && !assistantLocalFailed) {
    const id = modelId(assistantModel, f16)
    if (loadedModel() === id) return setState({ local: 'ready' })
    try {
      if (await isModelCached(id)) return void prepareModel(assistantModel, true)
    } catch {
      // Si no se puede consultar la caché, se ofrece descargarlo de nuevo.
    }
  }
  setState({ local: assistantLocalFailed ? 'error' : 'notDownloaded' })
}

/** Descarga (o carga, si ya está descargado) el modelo del dispositivo. */
export function prepareModel(size: LocalModelSize, cached = false) {
  setState({ local: cached ? 'loading' : 'downloading', progress: 0, progressText: '' })
  pending = loadModel(modelId(size, f16), (progress, progressText) =>
    setState({ progress, progressText }),
  )
    .then(() => {
      usePrefs.getState().set({ assistantModel: size, assistantLocalFailed: false })
      setState({ local: 'ready' })
    })
    .catch(() => {
      usePrefs.getState().set({ assistantModel: size })
      markLocalFailed()
    })
    .finally(() => {
      pending = null
    })
  return pending
}

/** Si se está cargando un modelo ya descargado, espera a que esté listo (o falle). */
export function waitForLocal() {
  return useAssistant.getState().local === 'loading' ? pending : null
}

/** El modelo no cargó o se colgó: se libera la GPU y no se vuelve a cargar solo. */
export function markLocalFailed() {
  resetLocal()
  usePrefs.getState().set({ assistantLocalFailed: true })
  setState({ local: 'error' })
}

export async function removeModel() {
  const { assistantModel, set } = usePrefs.getState()
  resetLocal()
  if (assistantModel) await deleteModel(modelId(assistantModel, f16)).catch(() => {})
  set({ assistantModel: null, assistantLocalFailed: false })
  setState({ local: 'notDownloaded' })
}

/** En móviles: borra los modelos que se descargaron antes y ocupan espacio sin funcionar. */
export async function removeAllModels() {
  resetLocal()
  await deleteDownloadedModels()
  usePrefs.getState().set({ assistantModel: null, assistantLocalFailed: false })
}
