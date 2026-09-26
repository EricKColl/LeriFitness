/** Material necesario para un ejercicio. Un ejercicio requiere TODOS los elementos de su lista. */
export const EQUIPMENT = [
  'bodyweight',
  'barbell',
  'rack',
  'ezBar',
  'dumbbell',
  'kettlebell',
  'cable',
  'machine',
  'bench',
  'pullupBar',
  'dipStation',
  'bands',
  'medicineBall',
  'stabilityBall',
  'foamRoller',
  'box',
  'other',
] as const

export type Equipment = (typeof EQUIPMENT)[number]

/** Material seleccionable por el usuario (el peso corporal siempre está disponible). */
export const USER_EQUIPMENT = EQUIPMENT.filter(
  (e): e is Exclude<Equipment, 'bodyweight' | 'other'> => e !== 'bodyweight' && e !== 'other',
)
export type UserEquipment = (typeof USER_EQUIPMENT)[number]

export const EQUIPMENT_PRESETS = {
  fullGym: [...USER_EQUIPMENT],
  homeDumbbells: ['dumbbell', 'bench', 'bands', 'pullupBar'],
  homeBasic: ['bands', 'pullupBar'],
  bodyweight: [],
} as const satisfies Record<string, readonly UserEquipment[]>

export type EquipmentPreset = keyof typeof EQUIPMENT_PRESETS

export function hasEquipment(required: readonly Equipment[], available: ReadonlySet<Equipment>) {
  return required.every((item) => item === 'bodyweight' || available.has(item))
}
