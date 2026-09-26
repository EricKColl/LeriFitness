import { create } from 'zustand'

export type Source = 'glossary' | 'local' | 'remote'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  source?: Source
  pending?: boolean
}

export type LocalStatus =
  'checking' | 'unsupported' | 'notDownloaded' | 'downloading' | 'ready' | 'error'

interface AssistantState {
  /** La conversación solo vive en memoria: al cerrar la app se olvida (privacidad). */
  messages: ChatMessage[]
  local: LocalStatus
  progress: number
  progressText: string
  busy: boolean
  push: (message: ChatMessage) => void
  update: (id: string, patch: Partial<ChatMessage>) => void
  clear: () => void
  set: (patch: Partial<Omit<AssistantState, 'push' | 'update' | 'clear' | 'set'>>) => void
}

export const useAssistant = create<AssistantState>()((set) => ({
  messages: [],
  local: 'checking',
  progress: 0,
  progressText: '',
  busy: false,
  push: (message) => set((s) => ({ messages: [...s.messages, message] })),
  update: (id, patch) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  clear: () => set({ messages: [] }),
  set: (patch) => set(patch),
}))
