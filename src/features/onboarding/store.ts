import { create } from 'zustand'

import {
  DEFAULT_WEEKDAYS,
  EQUIPMENT_PRESETS,
  type Goal,
  type Injury,
  type JobType,
  type Level,
  type Profile,
  type Sex,
  type UserEquipment,
  type Weekday,
} from '@/domain'

export interface Draft {
  goal?: Goal
  level?: Level
  sex?: Sex
  age: number
  heightCm: number
  weightKg: number
  job?: JobType
  weekdays: Weekday[]
  minutesPerSession: number
  equipment: UserEquipment[]
  injuries: Injury[]
}

interface OnboardingState {
  step: number
  direction: 1 | -1
  draft: Draft
  healthConsent: boolean
  termsAccepted: boolean
  go: (step: number) => void
  patch: (patch: Partial<Draft>) => void
  setHealthConsent: (value: boolean) => void
  setTermsAccepted: (value: boolean) => void
  reset: () => void
}

const initialDraft = (): Draft => ({
  age: 30,
  heightCm: 170,
  weightKg: 70,
  weekdays: [...DEFAULT_WEEKDAYS[3]!],
  minutesPerSession: 60,
  equipment: [...EQUIPMENT_PRESETS.fullGym],
  injuries: [],
})

/**
 * Borrador del onboarding en memoria: sobrevive a la navegación dentro de la app (por ejemplo, al
 * leer la política de privacidad) pero no se guarda hasta confirmar.
 */
export const useOnboarding = create<OnboardingState>()((set) => ({
  step: 0,
  direction: 1,
  draft: initialDraft(),
  healthConsent: false,
  termsAccepted: false,
  go: (step) => set((s) => ({ step, direction: step >= s.step ? 1 : -1 })),
  patch: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  setHealthConsent: (healthConsent) =>
    set((s) => ({ healthConsent, draft: healthConsent ? s.draft : { ...s.draft, injuries: [] } })),
  setTermsAccepted: (termsAccepted) => set({ termsAccepted }),
  reset: () =>
    set({
      step: 0,
      direction: 1,
      draft: initialDraft(),
      healthConsent: false,
      termsAccepted: false,
    }),
}))

export function draftToProfile(draft: Draft, healthConsent: boolean): Profile | null {
  if (!draft.goal || !draft.level || !draft.sex || !draft.job) return null
  return {
    goal: draft.goal,
    level: draft.level,
    sex: draft.sex,
    age: draft.age,
    heightCm: draft.heightCm,
    weightKg: draft.weightKg,
    job: draft.job,
    weekdays: draft.weekdays,
    minutesPerSession: draft.minutesPerSession,
    equipment: draft.equipment,
    injuries: healthConsent ? draft.injuries : [],
  }
}
