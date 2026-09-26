/**
 * Qué puede hacer este dispositivo con MagicErick.
 *
 * Los modelos locales necesitan entre 1 y 1,6 GB de memoria gráfica (según WebLLM). En móviles y
 * tabletas el navegador suele quedarse sin ella a mitad de respuesta, así que ahí no se ofrecen:
 * MagicErick responde con la IA en la nube o, sin cuenta, con el glosario.
 */
interface NavigatorLike {
  userAgent: string
  platform?: string
  maxTouchPoints?: number
  userAgentData?: { mobile?: boolean }
}

export function isMobileDevice(nav: NavigatorLike = navigator) {
  if (nav.userAgentData?.mobile) return true
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(nav.userAgent)) return true
  // iPadOS se presenta como un Mac de escritorio, pero con pantalla táctil.
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1
}

/** Cachés donde WebLLM guarda los modelos descargados (Cache API). */
const WEBLLM_CACHES = ['webllm/model', 'webllm/config', 'webllm/wasm']

/** ¿Hay algún modelo descargado? Se mira sin cargar WebLLM (pesa ~6 MB). */
export async function hasDownloadedModels() {
  if (!('caches' in globalThis)) return false
  try {
    return await caches.has('webllm/model')
  } catch {
    return false
  }
}

/** Borra todos los modelos descargados (p. ej. los que se bajaron en un móvil y no funcionan). */
export async function deleteDownloadedModels() {
  if (!('caches' in globalThis)) return
  await Promise.all(WEBLLM_CACHES.map((name) => caches.delete(name)))
}
