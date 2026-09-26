/**
 * Zonas corporales para molestias o lesiones. Es información de salud (RGPD art. 9):
 * solo se guarda en el dispositivo y solo con consentimiento explícito.
 */
export const INJURY_ZONES = [
  'neck',
  'shoulder',
  'elbow',
  'wrist',
  'lowerBack',
  'hip',
  'knee',
  'ankle',
] as const

export type InjuryZone = (typeof INJURY_ZONES)[number]

/** Cuánto carga un ejercicio una articulación o zona. */
export const STRESS_LEVELS = ['low', 'moderate', 'high'] as const
export type StressLevel = (typeof STRESS_LEVELS)[number]

/** Cómo describe el usuario su molestia. */
export const INJURY_SEVERITIES = ['mild', 'moderate', 'severe'] as const
export type InjurySeverity = (typeof INJURY_SEVERITIES)[number]

export interface Injury {
  zone: InjuryZone
  severity: InjurySeverity
}

const STRESS_RANK: Record<StressLevel, number> = { low: 1, moderate: 2, high: 3 }

/**
 * Máximo estrés tolerado para cada severidad: `mild` evita la carga alta; `moderate` y `severe`
 * solo permiten carga baja. Con `severe`, además, el motor prefiere ejercicios que no carguen la
 * zona en absoluto (ver `scoreExercise`) y la interfaz insiste en consultar a un profesional.
 */
const MAX_STRESS: Record<InjurySeverity, number> = { mild: 2, moderate: 1, severe: 1 }

/** ¿Está contraindicado un ejercicio con este estrés articular para esta molestia? */
export function isContraindicated(stress: StressLevel | undefined, severity: InjurySeverity) {
  if (!stress) return false
  return STRESS_RANK[stress] > MAX_STRESS[severity]
}
