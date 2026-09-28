import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { BRAND } from '@/config/brand'

export type ThemePreference = 'dark' | 'light' | 'system'

interface ThemeState {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

/** Preferencia de tema por dispositivo. Es un ajuste de interfaz, no un dato personal. */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'dark',
      setPreference: (preference) => set({ preference }),
    }),
    { name: 'forja-theme' },
  ),
)

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

export function resolveTheme(preference: ThemePreference): 'dark' | 'light' {
  if (preference === 'system') return darkQuery().matches ? 'dark' : 'light'
  return preference
}

function subscribeSystem(onChange: () => void) {
  const query = darkQuery()
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** Tema que indica ahora el navegador (sigue sus cambios en vivo). */
export const useSystemTheme = () =>
  useSyncExternalStore(subscribeSystem, () => (darkQuery().matches ? 'dark' : 'light'))

/** Tema que se ve en pantalla: la preferencia, o el del sistema si es «Sistema». */
export function useResolvedTheme(): 'dark' | 'light' {
  const preference = useThemeStore((s) => s.preference)
  const system = useSystemTheme()
  return preference === 'system' ? system : preference
}

export function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference)
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? BRAND.themeColorDark : BRAND.themeColorLight)
}

/** Sincroniza el DOM con la preferencia y con los cambios del sistema operativo. */
export function initTheme() {
  applyTheme(useThemeStore.getState().preference)
  useThemeStore.subscribe((state) => applyTheme(state.preference))
  darkQuery().addEventListener('change', () => {
    if (useThemeStore.getState().preference === 'system') applyTheme('system')
  })
}
