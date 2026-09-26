/**
 * Vocabulario muscular propio. Los identificadores coinciden con las regiones del mapa
 * muscular 2D (`data-muscle`) y, en fase 2, con los nodos del modelo 3D.
 */
export const MUSCLES = [
  'chest',
  'frontDelts',
  'sideDelts',
  'rearDelts',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'quads',
  'hamstrings',
  'glutes',
  'adductors',
  'abductors',
  'calves',
  'lats',
  'upperBack',
  'traps',
  'lowerBack',
  'neck',
] as const

export type Muscle = (typeof MUSCLES)[number]

export type BodyRegion = 'upper' | 'lower' | 'core'

export interface MuscleInfo {
  region: BodyRegion
  /** Vistas del mapa 2D en las que aparece. */
  views: readonly ('front' | 'back')[]
}

export const MUSCLE_INFO: Record<Muscle, MuscleInfo> = {
  chest: { region: 'upper', views: ['front'] },
  frontDelts: { region: 'upper', views: ['front'] },
  sideDelts: { region: 'upper', views: ['front', 'back'] },
  rearDelts: { region: 'upper', views: ['back'] },
  biceps: { region: 'upper', views: ['front'] },
  triceps: { region: 'upper', views: ['back'] },
  forearms: { region: 'upper', views: ['front', 'back'] },
  abs: { region: 'core', views: ['front'] },
  obliques: { region: 'core', views: ['front'] },
  quads: { region: 'lower', views: ['front'] },
  hamstrings: { region: 'lower', views: ['back'] },
  glutes: { region: 'lower', views: ['back'] },
  adductors: { region: 'lower', views: ['front'] },
  abductors: { region: 'lower', views: ['back'] },
  calves: { region: 'lower', views: ['back', 'front'] },
  lats: { region: 'upper', views: ['back'] },
  upperBack: { region: 'upper', views: ['back'] },
  traps: { region: 'upper', views: ['back', 'front'] },
  lowerBack: { region: 'core', views: ['back'] },
  neck: { region: 'upper', views: ['front', 'back'] },
}

export function isMuscle(value: string): value is Muscle {
  return (MUSCLES as readonly string[]).includes(value)
}
