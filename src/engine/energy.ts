/**
 * Gasto energético informativo: metabolismo basal con Mifflin-St Jeor multiplicado por un factor
 * de actividad (tipo de trabajo + días de entrenamiento). Es una estimación, no una prescripción.
 */
import type { JobType, Sex } from '@/domain'

import type { EnergyEstimate } from './types'

const JOB_FACTOR: Record<JobType, number> = {
  sedentary: 1.2,
  active: 1.375,
  physical: 1.55,
}

export function mifflinStJeor(sex: Sex, weightKg: number, heightCm: number, age: number) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function estimateEnergy(input: {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
  job: JobType
  trainingDays: number
}): EnergyEstimate {
  const bmr = mifflinStJeor(input.sex, input.weightKg, input.heightCm, input.age)
  const activityFactor = Math.min(1.9, JOB_FACTOR[input.job] + input.trainingDays * 0.035)
  return {
    bmr: Math.round(bmr),
    tdee: Math.round((bmr * activityFactor) / 10) * 10,
    activityFactor: Math.round(activityFactor * 1000) / 1000,
  }
}
