import { usePrefs } from '@/shared/stores/prefs'

let webgl: boolean | null = null

/** ¿Hay WebGL 2 utilizable? (se comprueba una sola vez). */
export function supportsWebGL() {
  if (webgl !== null) return webgl
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    webgl = !!gl
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webgl = false
  }
  return webgl
}

/** Dispositivos modestos (poca memoria o pocos núcleos): por defecto, mapa 2D. */
function lowPower() {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return (nav.deviceMemory ?? 4) < 2 || (navigator.hardwareConcurrency || 4) < 2
}

/** Vista 3D activa según la preferencia (automática por defecto) y el soporte del dispositivo. */
export function useAnatomy3D() {
  const preference = usePrefs((s) => s.anatomy3d)
  if (!supportsWebGL()) return false
  return preference ?? !lowPower()
}
