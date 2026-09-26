/**
 * Motor de planes: perfil + catálogo + historial → plan semanal con prescripciones y razones.
 * Determinista (sin azar ni reloj): la misma entrada produce siempre el mismo plan.
 */
import {
  MUSCLES,
  type Equipment,
  type Exercise,
  type Injury,
  type InjurySeverity,
  type Muscle,
  type Pattern,
} from '@/domain'

import { CONDITIONING_MINUTES, conditioningBlock, WEEKLY_CARDIO_MINUTES } from './cardio'
import { estimateEnergy } from './energy'
import { checkInPainReason, initialMesocycle } from './mesocycle'
import { setBounds, setScheme, type SetScheme } from './prescription'
import { isLoadable, roundLoad, suggestLoad } from './progression'
import { alternativesFor, candidatesFor, type SelectionContext } from './selection'
import {
  ANTAGONISTS,
  chooseSplit,
  FALLBACK_PATTERNS,
  TEMPLATES,
  type SlotDef,
  type TemplateId,
} from './templates'
import type {
  CardioBlock,
  MuscleVolume,
  Plan,
  PlanDay,
  PlanInput,
  Prescription,
  Reason,
  WarmupSet,
} from './types'
import { isDirect, volumeRanges, volumeReasons, weeklyTargets, type VolumeRange } from './volume'

export const ENGINE_VERSION = 1

/** Segundos de trabajo por serie (unilaterales: ambos lados). */
const WORK_SEC = 40
const UNILATERAL_FACTOR = 1.8
/** Cambio de ejercicio: preparar material, ajustar máquina. */
const TRANSITION_SEC = 60
/** Paso de un ejercicio al otro dentro de una superserie. */
const SUPERSET_SWITCH_SEC = 20
const RAMP_SEC = 150
const RAMP: { percent: number; reps: number }[] = [
  { percent: 40, reps: 8 },
  { percent: 60, reps: 5 },
  { percent: 80, reps: 3 },
]

interface WorkingSlot {
  key: string
  slot: SlotDef
  exercise: Exercise
  pattern: Pattern
  substitutedFrom: Pattern | null
  scheme: SetScheme
  sets: number
  min: number
  max: number
  pair: WorkingSlot | null
}

interface WorkingDay {
  template: TemplateId
  slots: WorkingSlot[]
  /** Huecos quitados por falta de tiempo: se recuperan si luego sobra tiempo y volumen. */
  timeDropped: WorkingSlot[]
  conditioning: CardioBlock | null
  generalWarmupMin: number
}

const SEVERITY_RANK: Record<InjurySeverity, number> = { mild: 0, moderate: 1, severe: 2 }

/** Lesiones del perfil + molestias del check-in (como lesión leve temporal). */
function effectiveInjuries(input: PlanInput): Injury[] {
  const byZone = new Map(input.profile.injuries.map((i) => [i.zone, i]))
  for (const zone of input.checkIn?.pain ?? []) {
    if (!byZone.has(zone)) byZone.set(zone, { zone, severity: 'mild' })
  }
  return [...byZone.values()].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.zone.localeCompare(b.zone),
  )
}

function workSeconds(ws: WorkingSlot) {
  const base =
    ws.scheme.unit === 'seconds' ? (ws.scheme.reps.min + ws.scheme.reps.max) / 2 : WORK_SEC
  return ws.exercise.unilateral ? base * UNILATERAL_FACTOR : base
}

function slotSeconds(ws: WorkingSlot) {
  return ws.sets * (workSeconds(ws) + ws.scheme.restSec) + TRANSITION_SEC
}

function pairSeconds(a: WorkingSlot, b: WorkingSlot) {
  const shared = Math.min(a.sets, b.sets)
  const rest = Math.max(a.scheme.restSec, b.scheme.restSec)
  const bigger = a.sets >= b.sets ? a : b
  const extra = Math.abs(a.sets - b.sets)
  return (
    shared * (workSeconds(a) + workSeconds(b) + SUPERSET_SWITCH_SEC + rest) +
    extra * (workSeconds(bigger) + bigger.scheme.restSec) +
    TRANSITION_SEC * 2
  )
}

function hasRamp(day: WorkingDay) {
  const first = day.slots[0]
  return (
    !!first &&
    first.slot.role === 'main' &&
    first.exercise.mechanic !== 'isolation' &&
    isLoadable(first.exercise)
  )
}

function daySeconds(day: WorkingDay) {
  let total = day.generalWarmupMin * 60 + (hasRamp(day) ? RAMP_SEC : 0)
  const counted = new Set<WorkingSlot>()
  for (const ws of day.slots) {
    if (counted.has(ws)) continue
    if (ws.pair) {
      total += pairSeconds(ws, ws.pair)
      counted.add(ws.pair)
    } else {
      total += slotSeconds(ws)
    }
    counted.add(ws)
  }
  return total + (day.conditioning?.minutes ?? 0) * 60
}

const ROLE_ORDER = { main: 0, secondary: 1, accessory: 2 } as const

/** Huecos en orden de recorte: accesorios del final primero, principales al final. */
function trimOrder(day: WorkingDay) {
  return [...day.slots]
    .map((ws, index) => ({ ws, index }))
    .sort((a, b) => ROLE_ORDER[b.ws.slot.role] - ROLE_ORDER[a.ws.slot.role] || b.index - a.index)
    .map((x) => x.ws)
}

function tryPairAntagonists(day: WorkingDay) {
  const free = day.slots.filter((ws) => !ws.pair && ws.slot.role !== 'main')
  for (const [p, q] of ANTAGONISTS) {
    const a = free.find((ws) => ws.pattern === p)
    const b = free.find((ws) => ws.pattern === q && ws !== a)
    if (a && b) {
      a.pair = b
      b.pair = a
      // La pareja se hace seguida: se coloca el segundo justo detrás del primero.
      day.slots.splice(day.slots.indexOf(b), 1)
      day.slots.splice(day.slots.indexOf(a) + 1, 0, b)
      return true
    }
  }
  return false
}

function dropSlot(day: WorkingDay, ws: WorkingSlot) {
  if (ws.pair) ws.pair.pair = null
  day.slots.splice(day.slots.indexOf(ws), 1)
}

/** Ajusta el día al tiempo disponible. Devuelve las razones de los recortes. */
function fitDay(day: WorkingDay, budgetSec: number): Reason[] {
  const reasons: Reason[] = []
  let trimmed = false
  let paired = false
  let guard = 200
  while (daySeconds(day) > budgetSec && guard-- > 0) {
    const order = trimOrder(day)
    const reducible = order.find((ws) => ws.slot.role !== 'main' && ws.sets > ws.min)
    if (reducible) {
      reducible.sets--
      trimmed = true
      continue
    }
    if (tryPairAntagonists(day)) {
      paired = true
      continue
    }
    const droppable = order.find((ws) => ws.slot.role !== 'main')
    if (droppable) {
      dropSlot(day, droppable)
      day.timeDropped.push(droppable)
      trimmed = true
      continue
    }
    const mainReducible = order.find((ws) => ws.sets > ws.min)
    if (mainReducible) {
      mainReducible.sets--
      trimmed = true
      continue
    }
    // Último recurso antes de quitar un básico: bajar de las series mínimas del objetivo a 2.
    const lastResort = order.find((ws) => ws.sets > 2)
    if (lastResort) {
      lastResort.sets--
      lastResort.min = Math.min(lastResort.min, lastResort.sets)
      trimmed = true
      continue
    }
    if (day.slots.length > 1) {
      dropSlot(day, order[0]!)
      trimmed = true
      continue
    }
    break
  }
  if (trimmed) reasons.push({ key: 'reasons.time.trimmed', params: { day: day.template } })
  if (paired) reasons.push({ key: 'reasons.time.superset', params: { day: day.template } })
  return reasons
}

function contributions(ws: WorkingSlot): [Muscle, number][] {
  return [
    ...ws.exercise.primaryMuscles.map((m) => [m, 1] as [Muscle, number]),
    ...ws.exercise.secondaryMuscles.map((m) => [m, 0.5] as [Muscle, number]),
  ]
}

function plannedVolume(days: WorkingDay[]) {
  const planned = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>
  for (const day of days)
    for (const ws of day.slots) for (const [m, c] of contributions(ws)) planned[m] += c * ws.sets
  return planned
}

/**
 * Respeta el máximo semanal por músculo: primero quita series de secundarios y accesorios, luego
 * de los principales (sin bajar del mínimo por hueco) y, si aún sobra, elimina huecos accesorios
 * cuyos músculos principales ya están por encima del máximo.
 */
function capVolume(days: WorkingDay[], ranges: Record<Muscle, VolumeRange>): Reason[] {
  const reasons: Reason[] = []
  const isOver = (planned: Record<Muscle, number>, m: Muscle) => planned[m] > ranges[m].max + 0.01
  for (const includeMain of [false, true]) {
    let guard = 500
    while (guard-- > 0) {
      const planned = plannedVolume(days)
      // Los principales solo se recortan por músculos con trabajo directo: que el press sume
      // volumen indirecto al deltoides anterior no debe quitar series de pecho.
      const over = MUSCLES.filter((m) => isOver(planned, m) && (!includeMain || isDirect(m))).sort(
        (a, b) => planned[b] - ranges[b].max - (planned[a] - ranges[a].max),
      )
      const victim = over
        .map((muscle) =>
          days
            .flatMap((day) => trimOrder(day))
            .find(
              (ws) =>
                (includeMain || ws.slot.role !== 'main') &&
                ws.sets > ws.min &&
                contributions(ws).some(([m]) => m === muscle),
            ),
        )
        .find((ws) => ws !== undefined)
      if (!victim) break
      victim.sets--
    }
  }
  // Si algún músculo directo sigue claramente por encima del máximo, se quitan huecos no
  // principales que lo trabajan siempre que sus músculos principales no bajen del mínimo.
  let guard = 50
  while (guard-- > 0) {
    const planned = plannedVolume(days)
    const wayOver = new Set(
      MUSCLES.filter((m) => isDirect(m) && planned[m] > ranges[m].max * 1.15 + 0.5),
    )
    const redundant = days
      .flatMap((day) => trimOrder(day).map((ws) => ({ day, ws })))
      .find(
        ({ day, ws }) =>
          ws.slot.role !== 'main' &&
          day.slots.length > 1 &&
          (ws.exercise.primaryMuscles.every((m) => planned[m] - ws.sets > ranges[m].max) ||
            (contributions(ws).some(([m]) => wayOver.has(m)) &&
              ws.exercise.primaryMuscles.every((m) => planned[m] - ws.sets >= ranges[m].min))),
      )
    if (!redundant) break
    dropSlot(redundant.day, redundant.ws)
    reasons.push({
      key: 'reasons.volume.slotDropped',
      params: { day: redundant.day.template, pattern: redundant.ws.pattern },
    })
  }
  return reasons
}

/**
 * Tras ajustar el volumen puede sobrar tiempo: se recuperan, en su orden original, los huecos que
 * se quitaron por tiempo si caben y no llevan ningún músculo principal por encima del máximo.
 */
function restoreSlots(days: WorkingDay[], ranges: Record<Muscle, VolumeRange>, budgetSec: number) {
  for (const day of days) {
    const order = TEMPLATES[day.template].map((s) => s.id)
    for (const ws of [...day.timeDropped].sort(
      (a, b) => order.indexOf(a.slot.id) - order.indexOf(b.slot.id),
    )) {
      ws.sets = ws.min
      ws.pair = null
      const planned = plannedVolume(days)
      if (ws.exercise.primaryMuscles.some((m) => planned[m] + ws.sets > ranges[m].max)) continue
      const index = day.slots.findIndex((x) => order.indexOf(x.slot.id) > order.indexOf(ws.slot.id))
      day.slots.splice(index === -1 ? day.slots.length : index, 0, ws)
      if (daySeconds(day) > budgetSec) dropSlot(day, ws)
    }
    day.timeDropped = []
  }
}

const ROLE_WEIGHT = { main: 1.3, secondary: 1.1, accessory: 1 } as const

/** Reparto voraz de series hacia el objetivo semanal, respetando el tiempo de cada día. */
function fillVolume(
  days: WorkingDay[],
  targets: Record<Muscle, number>,
  ranges: Record<Muscle, VolumeRange>,
  budgetSec: number,
  strengthFocus: boolean,
) {
  let guard = 400
  while (guard-- > 0) {
    const planned = plannedVolume(days)
    let best: { ws: WorkingSlot; gain: number } | null = null
    for (const day of days) {
      for (const ws of day.slots) {
        if (ws.sets >= ws.max) continue
        let gain = 0
        for (const [m, c] of contributions(ws)) {
          const before = planned[m]
          const after = before + c
          if (isDirect(m)) gain += Math.min(targets[m], after) - Math.min(targets[m], before)
          if (after > ranges[m].max) gain -= (after - Math.max(before, ranges[m].max)) * 2
        }
        gain *= ROLE_WEIGHT[ws.slot.role]
        if (strengthFocus && ws.slot.role === 'main') gain += 0.35
        if (gain <= 0.001) continue
        ws.sets++
        const fits = daySeconds(day) <= budgetSec
        ws.sets--
        if (!fits) continue
        if (!best || gain > best.gain + 1e-9) best = { ws, gain }
      }
    }
    if (!best) return
    best.ws.sets++
  }
}

function pickExercises(
  templates: TemplateId[],
  input: PlanInput,
  ctx: SelectionContext,
  reasons: Reason[],
): WorkingDay[] {
  const usage = new Map<string, number>()
  const { goal, level } = input.profile
  return templates.map((template) => {
    const slots: WorkingSlot[] = []
    const inDay = new Set<string>()
    const dayPatterns = new Set(TEMPLATES[template].map((s) => s.pattern))
    for (const slot of TEMPLATES[template]) {
      const fallbacks = FALLBACK_PATTERNS[slot.pattern] ?? []
      // Primero los respaldos que no duplican otro hueco del día; si no hay, cualquiera.
      const chain = [
        slot.pattern,
        ...fallbacks.filter((p) => !dayPatterns.has(p)),
        ...fallbacks.filter((p) => dayPatterns.has(p)),
      ]
      let chosen: { exercise: Exercise; pattern: Pattern; tier: 0 | 1 } | null = null
      for (const pattern of chain) {
        const best = candidatesFor(pattern, slot, input.catalog, ctx, usage, inDay)[0]
        if (best) {
          chosen = { exercise: best.exercise, pattern, tier: best.tier }
          break
        }
      }
      if (!chosen) {
        reasons.push({
          key: 'reasons.selection.dropped',
          params: { day: template, pattern: slot.pattern },
        })
        continue
      }
      if (chosen.pattern !== slot.pattern) {
        reasons.push({
          key: 'reasons.selection.substituted',
          params: { day: template, from: slot.pattern, to: chosen.pattern },
        })
      }
      if (chosen.tier === 1) {
        reasons.push({
          key: 'reasons.selection.aboveLevel',
          params: { exercise: chosen.exercise.id },
        })
      }
      const bounds = setBounds(slot.role, goal, level)
      usage.set(chosen.exercise.id, (usage.get(chosen.exercise.id) ?? 0) + 1)
      inDay.add(chosen.exercise.id)
      slots.push({
        key: `${template}.${slot.id}`,
        slot,
        exercise: chosen.exercise,
        pattern: chosen.pattern,
        substitutedFrom: chosen.pattern === slot.pattern ? null : slot.pattern,
        scheme: setScheme(goal, level, slot.role, chosen.exercise, isLoadable(chosen.exercise)),
        sets: bounds.start,
        min: bounds.min,
        max: bounds.max,
        pair: null,
      })
    }
    return { template, slots, timeDropped: [], conditioning: null, generalWarmupMin: 5 }
  })
}

const PULL_PATTERNS = new Set<Pattern>(['horizontalPull', 'verticalPull', 'pullover', 'rearDelt'])

export function generatePlan(input: PlanInput): Plan {
  const { profile, catalog } = input
  const history = input.history ?? []
  const mesocycle = input.mesocycle ?? initialMesocycle(profile.level)
  const injuries = effectiveInjuries(input)
  const equipment = new Set<Equipment>(['bodyweight', ...profile.equipment])
  const ctx: SelectionContext = { goal: profile.goal, level: profile.level, equipment, injuries }
  const reasons: Reason[] = []
  const warnings: Reason[] = []
  const budgetSec = profile.minutesPerSession * 60

  const split = chooseSplit(profile.weekdays.length, profile.level)
  reasons.push({ key: `reasons.split.${split.id}`, params: { days: profile.weekdays.length } })
  if (profile.level === 'beginner' && profile.weekdays.length >= 5)
    reasons.push({ key: 'reasons.split.beginnerManyDays' })
  reasons.push(...volumeReasons(profile))
  reasons.push({ key: `reasons.scheme.${profile.goal}` })
  for (const injury of injuries) {
    reasons.push({
      key: 'reasons.injury.filtered',
      params: { zone: injury.zone, severity: injury.severity },
    })
    warnings.push({ key: 'warnings.consultProfessional', params: { zone: injury.zone } })
  }
  if (input.checkIn?.pain.length) reasons.push(...checkInPainReason(input.checkIn.pain))

  const ranges = volumeRanges(profile)
  const targets = weeklyTargets(ranges, mesocycle.volumeStep)

  // 1. Ejercicios por hueco
  const days = pickExercises(split.days, input, ctx, reasons)

  // 2. Acondicionamiento cuando el objetivo lo pide y el tiempo lo permite
  const conditioningMinutes = CONDITIONING_MINUTES[profile.goal] ?? 0
  const weeklyCardioMinutes = WEEKLY_CARDIO_MINUTES[profile.goal]
  if (conditioningMinutes > 0) {
    if (profile.minutesPerSession - conditioningMinutes >= 35) {
      for (const day of days)
        day.conditioning = conditioningBlock(profile.goal, conditioningMinutes, catalog, ctx)
      reasons.push({ key: 'reasons.cardio.included', params: { minutes: conditioningMinutes } })
    } else {
      reasons.push({ key: 'reasons.cardio.restDays', params: { minutes: weeklyCardioMinutes } })
    }
  }
  reasons.push({ key: 'reasons.cardio.who', params: { minutes: weeklyCardioMinutes } })

  // 3. Ajuste al tiempo, techo de volumen y reparto voraz hacia el objetivo
  for (const day of days) {
    if (profile.minutesPerSession <= 30) day.generalWarmupMin = 3
    reasons.push(...fitDay(day, budgetSec))
  }
  reasons.push(...capVolume(days, ranges))
  restoreSlots(days, ranges, budgetSec)
  fillVolume(days, targets, ranges, budgetSec, profile.goal === 'strength')

  // 4. Prescripciones finales
  const byId = new Map(catalog.map((e) => [e.id, e]))
  const deload = mesocycle.deload
  const planDays: PlanDay[] = days.map((day) => {
    const prescriptions: Prescription[] = day.slots.map((ws) => {
      const load = suggestLoad(ws.exercise, ws.scheme.reps, ws.scheme.rir, history)
      const sets = deload ? Math.max(1, Math.ceil(ws.sets / 2)) : ws.sets
      const rir = deload
        ? { min: Math.min(5, ws.scheme.rir.min + 2), max: Math.min(5, ws.scheme.rir.max + 2) }
        : ws.scheme.rir
      return {
        slotId: ws.key,
        exerciseId: ws.exercise.id,
        pattern: ws.pattern,
        role: ws.slot.role,
        sets,
        reps: ws.scheme.reps,
        unit: ws.scheme.unit,
        rir,
        restSec: ws.scheme.restSec,
        loadKg: load.kg,
        loadNote:
          deload && load.kg !== null ? { key: 'load.deload', params: { kg: load.kg } } : load.note,
        supersetWith: ws.pair?.key ?? null,
        alternatives: alternativesFor(ws.exercise, byId, catalog, ctx),
        substitutedFrom: ws.substitutedFrom,
      }
    })
    const first = day.slots[0]
    const ramp: WarmupSet[] =
      first && hasRamp(day)
        ? RAMP.map(({ percent, reps }) => {
            const work = prescriptions[0]?.loadKg ?? null
            return {
              percent,
              reps,
              kg:
                work === null ? null : roundLoad((work * percent) / 100, first.exercise.equipment),
            }
          })
        : []
    if (deload) for (const ws of day.slots) ws.sets = Math.max(1, Math.ceil(ws.sets / 2))
    return {
      id: day.template,
      template: day.template,
      focus: `days.${day.template}`,
      prescriptions,
      warmup: {
        generalMinutes: day.generalWarmupMin,
        rampExerciseId: ramp.length ? (first?.exercise.id ?? null) : null,
        ramp,
      },
      conditioning: day.conditioning,
      estimatedMinutes: Math.ceil(daySeconds(day) / 60),
    }
  })

  // 5. Resumen de volumen y avisos
  const planned = plannedVolume(days)
  const volume = Object.fromEntries(
    MUSCLES.map((m) => [
      m,
      {
        min: ranges[m].min,
        max: ranges[m].max,
        target: deload ? Math.round(targets[m] * 5) / 10 : targets[m],
        planned: Math.round(planned[m] * 10) / 10,
      } satisfies MuscleVolume,
    ]),
  ) as Record<Muscle, MuscleVolume>

  const noPull = !planDays.some((d) => d.prescriptions.some((p) => PULL_PATTERNS.has(p.pattern)))
  if (noPull) warnings.push({ key: 'warnings.noPulling' })
  const short = MUSCLES.filter(
    (m) => isDirect(m) && !deload && planned[m] < ranges[m].min * 0.6 && ranges[m].min > 0,
  )
  if (short.length)
    warnings.push({ key: 'warnings.lowVolume', params: { muscles: short.join(',') } })

  if (mesocycle.calibration && history.length === 0)
    reasons.push({ key: 'reasons.plan.calibration' })
  reasons.push({
    key: deload ? 'reasons.plan.deload' : 'reasons.plan.mesocycle',
    params: { week: mesocycle.week, length: mesocycle.length },
  })
  reasons.push({ key: 'reasons.plan.progression' })

  return {
    engineVersion: ENGINE_VERSION,
    goal: profile.goal,
    level: profile.level,
    split: split.id,
    mesocycle,
    weekKind: deload ? 'deload' : mesocycle.calibration ? 'calibration' : 'accumulation',
    days: planDays,
    volume,
    weeklyCardioMinutes,
    energy: estimateEnergy({
      sex: profile.sex,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      age: profile.age,
      job: profile.job,
      trainingDays: profile.weekdays.length,
    }),
    restrictions: injuries,
    reasons,
    warnings,
  }
}
