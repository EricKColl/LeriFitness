import { create } from 'zustand'

export type Source = 'glossary' | 'local' | 'remote'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  source?: Source
  pending?: boolean
}

/**
 * Estado del modelo en el dispositivo:
 * - `mobile`: móvil o tableta; no se ofrece (se bloquea por falta de memoria gráfica).
 * - `unsupported`: el navegador no tiene WebGPU.
 * - `loading`: cargando un modelo ya descargado; `downloading`: descargándolo por primera vez.
 * - `error`: no cargó o dejó de responder en este dispositivo (se puede reintentar).
 */
export type LocalStatus =
  | 'checking'
  | 'mobile'
  | 'unsupported'
  | 'notDownloaded'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'error'

interface AssistantState {
  /** La conversación solo vive en memoria: al cerrar la app se olvida (privacidad). */
  messages: ChatMessage[]
  local: LocalStatus
  progress: number
  progressText: string
  busy: boolean
  /** Ventana de MagicErick abierta. */
  open: boolean
  /** Ejercicio sobre el que se pregunta (al abrir desde su ficha o desde la sesión). */
  exerciseId: string | null
  push: (message: ChatMessage) => void
  update: (id: string, patch: Partial<ChatMessage>) => void
  remove: (id: string) => void
  clear: () => void
  set: (
    patch: Partial<Omit<AssistantState, 'push' | 'update' | 'remove' | 'clear' | 'set'>>,
  ) => void
}

export const useAssistant = create<AssistantState>()((set) => ({
  messages: [],
  local: 'checking',
  progress: 0,
  progressText: '',
  busy: false,
  open: false,
  exerciseId: null,
  push: (message) => set((s) => ({ messages: [...s.messages, message] })),
  update: (id, patch) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  remove: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
  clear: () => set({ messages: [] }),
  set: (patch) => set(patch),
}))

/** Abre la ventana de MagicErick (con un ejercicio como tema, si se indica). */
export function openMagicErick(exerciseId: string | null = null) {
  useAssistant.setState({ open: true, exerciseId })
}

export function closeMagicErick() {
  useAssistant.setState({ open: false })
}
