/**
 * Plantillas de día por huecos de patrón y reparto semanal (split).
 *
 * La frecuencia de 2 veces por semana por grupo muscular es la referencia (Schoenfeld 2016):
 * con 1-3 días se usa cuerpo completo; con más, torso/pierna y empuje/tirón/pierna.
 */
import type { Level, Pattern } from '@/domain'

import type { SlotRole, SplitId } from './types'

/** Preferencias de variante para un hueco (p. ej. el press del día B, inclinado). */
export type Variant = 'incline' | 'machine' | 'unilateral' | 'hammer' | 'overhead' | 'romanian'

export interface SlotDef {
  id: string
  pattern: Pattern
  role: SlotRole
  prefer?: Variant
}

export type TemplateId =
  | 'fullBody'
  | 'fullBodyA'
  | 'fullBodyB'
  | 'fullBodyC'
  | 'upperA'
  | 'upperB'
  | 'lowerA'
  | 'lowerB'
  | 'push'
  | 'pull'
  | 'pushB'
  | 'pullB'

const slot = (id: string, pattern: Pattern, role: SlotRole, prefer?: Variant): SlotDef => ({
  id,
  pattern,
  role,
  prefer,
})

/** Los huecos van en orden de ejecución y de prioridad: los últimos se recortan antes. */
export const TEMPLATES: Record<TemplateId, SlotDef[]> = {
  fullBody: [
    slot('squat', 'squat', 'main'),
    slot('push', 'horizontalPush', 'main'),
    slot('pull', 'verticalPull', 'secondary'),
    slot('hinge', 'hinge', 'secondary'),
    slot('row', 'horizontalPull', 'accessory'),
    slot('press', 'verticalPush', 'accessory'),
    slot('lateral', 'lateralRaise', 'accessory'),
    slot('core', 'coreAntiExtension', 'accessory'),
  ],
  fullBodyA: [
    slot('squat', 'squat', 'main'),
    slot('push', 'horizontalPush', 'main'),
    slot('row', 'horizontalPull', 'secondary'),
    slot('hinge', 'hinge', 'secondary'),
    slot('lateral', 'lateralRaise', 'accessory'),
    slot('biceps', 'elbowFlexion', 'accessory'),
    slot('core', 'coreAntiExtension', 'accessory'),
  ],
  fullBodyB: [
    slot('hinge', 'hinge', 'main'),
    slot('press', 'verticalPush', 'main'),
    slot('pull', 'verticalPull', 'secondary'),
    slot('lunge', 'lunge', 'secondary'),
    slot('rearDelt', 'rearDelt', 'accessory'),
    slot('triceps', 'elbowExtension', 'accessory'),
    slot('calves', 'calfRaise', 'accessory'),
  ],
  fullBodyC: [
    slot('squat', 'squat', 'main', 'machine'),
    slot('push', 'horizontalPush', 'main', 'incline'),
    slot('row', 'horizontalPull', 'secondary', 'unilateral'),
    slot('hip', 'hipExtension', 'secondary'),
    slot('lateral', 'lateralRaise', 'accessory'),
    slot('biceps', 'elbowFlexion', 'accessory', 'hammer'),
    slot('core', 'coreFlexion', 'accessory'),
  ],
  upperA: [
    slot('push', 'horizontalPush', 'main'),
    slot('row', 'horizontalPull', 'main'),
    slot('press', 'verticalPush', 'secondary'),
    slot('pull', 'verticalPull', 'secondary'),
    slot('lateral', 'lateralRaise', 'accessory'),
    slot('biceps', 'elbowFlexion', 'accessory'),
    slot('triceps', 'elbowExtension', 'accessory'),
  ],
  upperB: [
    slot('pull', 'verticalPull', 'main'),
    slot('push', 'horizontalPush', 'main', 'incline'),
    slot('row', 'horizontalPull', 'secondary', 'unilateral'),
    slot('fly', 'chestFly', 'accessory'),
    slot('rearDelt', 'rearDelt', 'accessory'),
    slot('triceps', 'elbowExtension', 'accessory', 'overhead'),
    slot('biceps', 'elbowFlexion', 'accessory', 'hammer'),
  ],
  lowerA: [
    slot('squat', 'squat', 'main'),
    slot('hinge', 'hinge', 'secondary', 'romanian'),
    slot('lunge', 'lunge', 'secondary'),
    slot('legCurl', 'kneeFlexion', 'accessory'),
    slot('calves', 'calfRaise', 'accessory'),
    slot('core', 'coreAntiExtension', 'accessory'),
  ],
  lowerB: [
    slot('hinge', 'hinge', 'main'),
    slot('squat', 'squat', 'secondary', 'machine'),
    slot('hip', 'hipExtension', 'secondary'),
    slot('legExt', 'kneeExtension', 'accessory'),
    slot('calves', 'calfRaise', 'accessory'),
    slot('core', 'coreRotation', 'accessory'),
  ],
  push: [
    slot('push', 'horizontalPush', 'main'),
    slot('press', 'verticalPush', 'secondary'),
    slot('incline', 'horizontalPush', 'secondary', 'incline'),
    slot('lateral', 'lateralRaise', 'accessory'),
    slot('fly', 'chestFly', 'accessory'),
    slot('triceps', 'elbowExtension', 'accessory'),
  ],
  pull: [
    slot('pull', 'verticalPull', 'main'),
    slot('row', 'horizontalPull', 'main'),
    slot('pullover', 'pullover', 'secondary'),
    slot('rearDelt', 'rearDelt', 'accessory'),
    slot('biceps', 'elbowFlexion', 'accessory'),
    slot('shrug', 'shrug', 'accessory'),
  ],
  pushB: [
    slot('press', 'verticalPush', 'main'),
    slot('push', 'horizontalPush', 'main', 'incline'),
    slot('dip', 'dip', 'secondary'),
    slot('lateral', 'lateralRaise', 'accessory'),
    slot('fly', 'chestFly', 'accessory'),
    slot('triceps', 'elbowExtension', 'accessory', 'overhead'),
  ],
  pullB: [
    slot('row', 'horizontalPull', 'main'),
    slot('pull', 'verticalPull', 'main'),
    slot('rowB', 'horizontalPull', 'secondary', 'unilateral'),
    slot('rearDelt', 'rearDelt', 'accessory'),
    slot('biceps', 'elbowFlexion', 'accessory', 'hammer'),
    slot('core', 'coreFlexion', 'accessory'),
  ],
}

export interface SplitChoice {
  id: SplitId
  days: TemplateId[]
}

export function chooseSplit(days: number, level: Level): SplitChoice {
  switch (days) {
    case 1:
      return { id: 'fullBody1', days: ['fullBody'] }
    case 2:
      return { id: 'fullBody2', days: ['fullBodyA', 'fullBodyB'] }
    case 3:
      return level === 'beginner'
        ? { id: 'fullBody3', days: ['fullBodyA', 'fullBodyB', 'fullBodyC'] }
        : { id: 'upperLowerFull', days: ['upperA', 'lowerA', 'fullBodyC'] }
    case 4:
      return { id: 'upperLower', days: ['upperA', 'lowerA', 'upperB', 'lowerB'] }
    case 5:
      return { id: 'upperLowerPushPull', days: ['upperA', 'lowerA', 'push', 'pull', 'lowerB'] }
    case 6:
      return { id: 'pushPullLegs', days: ['push', 'pull', 'lowerA', 'pushB', 'pullB', 'lowerB'] }
    default:
      throw new Error(`Días por semana fuera de rango: ${days}`)
  }
}

/** Patrones de respaldo cuando no hay ningún ejercicio válido para el patrón del hueco. */
export const FALLBACK_PATTERNS: Partial<Record<Pattern, Pattern[]>> = {
  squat: ['lunge', 'hipExtension', 'kneeExtension'],
  lunge: ['squat', 'hipExtension'],
  hinge: ['hipExtension', 'kneeFlexion'],
  hipExtension: ['hinge', 'kneeFlexion'],
  kneeFlexion: ['hipExtension', 'hinge'],
  kneeExtension: ['squat', 'lunge'],
  horizontalPush: ['dip', 'chestFly'],
  verticalPush: ['lateralRaise', 'horizontalPush'],
  chestFly: ['horizontalPush'],
  dip: ['elbowExtension', 'horizontalPush'],
  horizontalPull: ['verticalPull', 'rearDelt'],
  verticalPull: ['horizontalPull', 'pullover'],
  pullover: ['verticalPull', 'horizontalPull'],
  lateralRaise: ['verticalPush'],
  rearDelt: ['horizontalPull'],
  elbowFlexion: ['verticalPull'],
  elbowExtension: ['dip'],
  shrug: ['horizontalPull'],
  coreAntiExtension: ['coreFlexion', 'coreLateral'],
  coreFlexion: ['coreAntiExtension', 'coreRotation'],
  coreRotation: ['coreLateral', 'coreAntiExtension'],
  coreLateral: ['coreRotation', 'coreAntiExtension'],
}

/** Parejas de patrones antagonistas que pueden ir en superserie para ahorrar tiempo. */
export const ANTAGONISTS: [Pattern, Pattern][] = [
  ['elbowFlexion', 'elbowExtension'],
  ['horizontalPush', 'horizontalPull'],
  ['verticalPush', 'verticalPull'],
  ['chestFly', 'rearDelt'],
  ['lateralRaise', 'rearDelt'],
  ['kneeExtension', 'kneeFlexion'],
  ['calfRaise', 'coreAntiExtension'],
  ['calfRaise', 'coreFlexion'],
  ['calfRaise', 'coreRotation'],
  ['lateralRaise', 'elbowFlexion'],
  ['rearDelt', 'elbowExtension'],
]
