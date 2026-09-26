import type {
  CheckIn,
  Exercise,
  Goal,
  InjuryZone,
  Level,
  Muscle,
  Pattern,
  Profile,
  SessionLog,
} from '@/domain'

/**
 * Explicación de una decisión del motor: clave i18n (namespace `engine`) + parámetros.
 * La interfaz traduce las razones; el motor nunca produce texto final.
 */
export interface Reason {
  key: string
  params?: Record<string, string | number>
}

export type SlotRole = 'main' | 'secondary' | 'accessory'

export type SplitId =
  | 'fullBody1'
  | 'fullBody2'
  | 'fullBody3'
  | 'upperLowerFull'
  | 'upperLower'
  | 'upperLowerPushPull'
  | 'pushPullLegs'

export type WeekKind = 'calibration' | 'accumulation' | 'deload'

/** Estado del mesociclo que se guarda entre semanas. */
export interface MesocycleState {
  /** Número de mesociclo desde el inicio (1, 2…). */
  index: number
  /** Semana dentro del mesociclo (1…length). */
  week: number
  /** Semanas totales, incluida la descarga. */
  length: number
  /** Series extra por músculo sobre la base (progresión de volumen). */
  volumeStep: number
  /** La semana actual es de descarga (programada o anticipada). */
  deload: boolean
  /** Semana del primer plan de todos: se calibran cargas. */
  calibration: boolean
}

export interface RepRange {
  min: number
  max: number
}

export interface Prescription {
  slotId: string
  exerciseId: string
  pattern: Pattern
  role: SlotRole
  sets: number
  reps: RepRange
  /** `seconds` en isométricos (planchas): `reps` son segundos de mantenimiento. */
  unit: 'reps' | 'seconds'
  /** Repeticiones en reserva objetivo. */
  rir: RepRange
  restSec: number
  /** Carga sugerida en kg (redondeada al material) o `null` si no hay historial o no aplica. */
  loadKg: number | null
  /** Clave i18n que explica cómo progresar o qué hacer hoy con la carga. */
  loadNote: Reason
  /** Id de la prescripción con la que se hace en superserie. */
  supersetWith: string | null
  /** Alternativas válidas (material + lesiones + nivel) ordenadas por parecido. */
  alternatives: string[]
  /** Si el hueco se cubrió con un patrón de respaldo, el patrón original. */
  substitutedFrom: Pattern | null
}

export interface WarmupSet {
  percent: number
  reps: number
  kg: number | null
}

export interface Warmup {
  generalMinutes: number
  /** Series de aproximación del primer ejercicio multiarticular. */
  rampExerciseId: string | null
  ramp: WarmupSet[]
}

export interface CardioBlock {
  /** Ejercicio de cardio del catálogo o `null` para «camina a paso vivo al aire libre». */
  exerciseId: string | null
  minutes: number
  intensity: 'easy' | 'moderate' | 'intervals'
}

export interface PlanDay {
  id: string
  template: string
  /** Clave i18n del foco del día (`engine:days.<template>`). */
  focus: string
  prescriptions: Prescription[]
  warmup: Warmup
  conditioning: CardioBlock | null
  estimatedMinutes: number
}

export interface MuscleVolume {
  min: number
  max: number
  target: number
  planned: number
}

export interface EnergyEstimate {
  bmr: number
  tdee: number
  activityFactor: number
}

export interface Plan {
  engineVersion: number
  goal: Goal
  level: Level
  split: SplitId
  mesocycle: MesocycleState
  weekKind: WeekKind
  days: PlanDay[]
  volume: Record<Muscle, MuscleVolume>
  /** Minutos semanales de actividad aeróbica recomendados (OMS: 150-300 moderada). */
  weeklyCardioMinutes: number
  energy: EnergyEstimate
  /** Lesiones efectivas usadas para filtrar (las del perfil + molestias del check-in). */
  restrictions: { zone: InjuryZone; severity: 'mild' | 'moderate' | 'severe' }[]
  reasons: Reason[]
  warnings: Reason[]
}

export interface PlanInput {
  profile: Profile
  catalog: readonly Exercise[]
  history?: readonly SessionLog[]
  mesocycle?: MesocycleState
  checkIn?: CheckIn | null
}

/** Resumen de una semana entrenada, base de la adaptación. */
export interface WeekReview {
  plannedSessions: number
  completedSessions: number
  /** Media del RPE de sesión (1-10) o `null` si no se registró. */
  averageRpe: number | null
  /** Ejercicios principales cuyo rendimiento (e1RM) cayó en las dos últimas sesiones. */
  decliningLifts: number
  checkIn: CheckIn | null
}
