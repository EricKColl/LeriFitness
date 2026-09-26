import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PrefsState {
  /** Pitido al terminar el descanso (Web Audio). */
  sound: boolean
  /** Vibración al terminar el descanso y al desbloquear logros. */
  vibration: boolean
  /** Mantener la pantalla encendida durante la sesión (Wake Lock). */
  keepAwake: boolean
  /** La invitación a instalar se descartó. */
  installDismissedAt: number | null
  /** Lunes de la semana cuyo check-in se pospuso (no se vuelve a sugerir). */
  checkInDismissed: string | null
  set: (patch: Partial<Omit<PrefsState, 'set'>>) => void
}

/** Preferencias de interfaz por dispositivo. No son datos personales. */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      sound: true,
      vibration: true,
      keepAwake: true,
      installDismissedAt: null,
      checkInDismissed: null,
      set: (patch) => set(patch),
    }),
    { name: 'forja-prefs' },
  ),
)
