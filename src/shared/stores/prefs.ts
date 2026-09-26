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
  /** Tamaño del modelo del asistente local descargado (`null` = ninguno). */
  assistantModel: 'quality' | 'light' | null
  /** Consentimiento para usar el asistente en la nube (sin datos personales ni de salud). */
  assistantCloud: boolean
  /** El modelo local no cargó o se colgó en este dispositivo: no se vuelve a cargar solo. */
  assistantLocalFailed: boolean
  /** Modelo anatómico 3D: `null` = automático (según el dispositivo). */
  anatomy3d: boolean | null
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
      anatomy3d: null,
      assistantModel: null,
      assistantCloud: false,
      assistantLocalFailed: false,
      set: (patch) => set(patch),
    }),
    { name: 'forja-prefs' },
  ),
)
