/**
 * Volumen semanal por músculo, en series efectivas con conteo fraccional: una serie cuenta 1
 * para los músculos principales del ejercicio y 0,5 para los secundarios (Pelland et al. 2024).
 *
 * Rangos base para un intermedio que busca hipertrofia, a partir de la relación dosis-respuesta
 * (Schoenfeld 2017) y de las guías de práctica habituales. El resto de perfiles se obtiene con
 * multiplicadores por nivel, objetivo, edad y tipo de trabajo.
 */
import { MUSCLES, type Goal, type JobType, type Level, type Muscle } from '@/domain'

import type { Reason } from './types'

export interface VolumeRange {
  min: number
  max: number
}

export const BASE_VOLUME: Record<Muscle, VolumeRange> = {
  chest: { min: 10, max: 16 },
  lats: { min: 8, max: 14 },
  upperBack: { min: 6, max: 12 },
  sideDelts: { min: 8, max: 16 },
  rearDelts: { min: 6, max: 12 },
  // Indirecto: el trabajo de press ya lo estimula; el techo tiene en cuenta ese volumen.
  frontDelts: { min: 0, max: 12 },
  biceps: { min: 6, max: 14 },
  triceps: { min: 6, max: 12 },
  quads: { min: 8, max: 16 },
  hamstrings: { min: 6, max: 12 },
  glutes: { min: 4, max: 12 },
  calves: { min: 6, max: 12 },
  abs: { min: 4, max: 12 },
  obliques: { min: 0, max: 6 },
  adductors: { min: 0, max: 6 },
  abductors: { min: 0, max: 6 },
  forearms: { min: 0, max: 6 },
  traps: { min: 0, max: 8 },
  lowerBack: { min: 0, max: 6 },
  neck: { min: 0, max: 4 },
}

export const LEVEL_VOLUME: Record<Level, number> = {
  beginner: 0.6,
  intermediate: 1,
  advanced: 1.2,
}

export const GOAL_VOLUME: Record<Goal, number> = {
  hypertrophy: 1,
  strength: 0.8,
  fatLoss: 0.85,
  health: 0.6,
  endurance: 0.7,
}

/** Músculos que más cargan quienes tienen un trabajo físico. */
const PHYSICAL_JOB_MUSCLES = new Set<Muscle>([
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
  'abductors',
  'lats',
  'upperBack',
  'lowerBack',
  'traps',
])

/** Músculos que suelen quedarse cortos en quien pasa el día sentado. */
const SEDENTARY_EMPHASIS = new Set<Muscle>(['upperBack', 'rearDelts', 'glutes'])

/** Músculos con trabajo directo programado; el resto solo se limita (trabajo indirecto). */
export function isDirect(muscle: Muscle) {
  return BASE_VOLUME[muscle].min > 0
}

export interface VolumeProfile {
  level: Level
  goal: Goal
  age: number
  job: JobType
}

/** Rango semanal de series por músculo para un perfil. */
export function volumeRanges(profile: VolumeProfile) {
  const common =
    LEVEL_VOLUME[profile.level] * GOAL_VOLUME[profile.goal] * (profile.age >= 60 ? 0.9 : 1)
  const ranges = {} as Record<Muscle, VolumeRange>
  for (const muscle of MUSCLES) {
    let factor = common
    if (profile.job === 'physical' && PHYSICAL_JOB_MUSCLES.has(muscle)) factor *= 0.85
    if (profile.job === 'sedentary' && SEDENTARY_EMPHASIS.has(muscle)) factor *= 1.15
    const base = BASE_VOLUME[muscle]
    ranges[muscle] = {
      min: round1(base.min * factor),
      max: Math.max(round1(base.max * factor), 2),
    }
  }
  return ranges
}

/** Punto de partida del mesociclo dentro del rango (cerca del mínimo efectivo). */
export const START_FRACTION = 0.35

/**
 * Objetivo semanal: parte cerca del mínimo y sube `volumeStep` series por semana hasta el máximo.
 * Los músculos de trabajo indirecto no persiguen objetivo (0): solo tienen techo.
 */
export function weeklyTargets(ranges: Record<Muscle, VolumeRange>, volumeStep: number) {
  const targets = {} as Record<Muscle, number>
  for (const muscle of MUSCLES) {
    const { min, max } = ranges[muscle]
    targets[muscle] = isDirect(muscle)
      ? Math.min(max, round1(min + (max - min) * START_FRACTION + volumeStep))
      : 0
  }
  return targets
}

export function volumeReasons(profile: VolumeProfile): Reason[] {
  const reasons: Reason[] = [
    { key: 'reasons.volume.level', params: { level: profile.level } },
    { key: 'reasons.volume.goal', params: { goal: profile.goal } },
  ]
  if (profile.age >= 60) reasons.push({ key: 'reasons.volume.age' })
  if (profile.job === 'physical') reasons.push({ key: 'reasons.volume.physicalJob' })
  if (profile.job === 'sedentary') reasons.push({ key: 'reasons.volume.sedentaryJob' })
  return reasons
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}
