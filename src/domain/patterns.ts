/** Patrones de movimiento: la unidad con la que el motor construye y sustituye ejercicios. */
export const PATTERNS = [
  'squat',
  'hinge',
  'lunge',
  'hipExtension',
  'kneeExtension',
  'kneeFlexion',
  'calfRaise',
  'hipAbduction',
  'hipAdduction',
  'horizontalPush',
  'verticalPush',
  'chestFly',
  'dip',
  'horizontalPull',
  'verticalPull',
  'pullover',
  'shrug',
  'lateralRaise',
  'frontRaise',
  'rearDelt',
  'elbowFlexion',
  'elbowExtension',
  'wrist',
  'coreFlexion',
  'coreAntiExtension',
  'coreRotation',
  'coreLateral',
  'carry',
  'neck',
  'olympic',
  'plyometric',
  'cardio',
  'mobility',
  'other',
] as const

export type Pattern = (typeof PATTERNS)[number]

/** Patrones que el motor puede programar como trabajo de fuerza. */
export const STRENGTH_PATTERNS: ReadonlySet<Pattern> = new Set(
  PATTERNS.filter((p) => !['olympic', 'plyometric', 'cardio', 'mobility', 'other'].includes(p)),
)
