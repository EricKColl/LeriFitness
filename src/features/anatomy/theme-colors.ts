import { useSyncExternalStore } from 'react'

/**
 * Colores del tema (variables CSS en OKLCH) convertidos a hexadecimal sRGB para Three.js, que no
 * entiende OKLCH. Se recalculan al cambiar entre tema claro y oscuro.
 */
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

const isDark = () => document.documentElement.classList.contains('dark')

let context: CanvasRenderingContext2D | null = null

export function cssVarToHex(name: string) {
  context ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!context || !value) return '#888888'
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = '#888888'
  context.fillStyle = value
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export const ANATOMY_COLOR_VARS = [
  '--heat-0',
  '--heat-1',
  '--heat-2',
  '--heat-3',
  '--heat-4',
  '--heat-5',
  '--anatomy-muscle',
  '--anatomy-bone',
  '--warning',
  '--ember',
  '--destructive',
  '--foreground',
] as const
export type AnatomyColorVar = (typeof ANATOMY_COLOR_VARS)[number]

const cache = new Map<boolean, Record<AnatomyColorVar, string>>()

function snapshot() {
  const dark = isDark()
  let colors = cache.get(dark)
  if (!colors) {
    colors = Object.fromEntries(ANATOMY_COLOR_VARS.map((v) => [v, cssVarToHex(v)])) as Record<
      AnatomyColorVar,
      string
    >
    cache.set(dark, colors)
  }
  return colors
}

export function useAnatomyColors() {
  return useSyncExternalStore(subscribe, snapshot)
}
