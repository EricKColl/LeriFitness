import { describe, expect, it } from 'vitest'

import {
  DEFAULT_WEEKDAYS,
  EQUIPMENT_PRESETS,
  GOALS,
  hasEquipment,
  isContraindicated,
  LEVEL_RANK,
  LEVELS,
  MUSCLES,
  type Equipment,
  type EquipmentPreset,
  type Injury,
  type Profile,
  type Weekday,
} from '@/domain'
import { CATALOG, makeProfile, makeSession } from '@/test/fixtures'

import { generatePlan } from './generate'
import { initialMesocycle } from './mesocycle'
import { isDirect } from './volume'
import type { Plan } from './types'

const byId = new Map(CATALOG.map((e) => [e.id, e]))

const INJURY_SETS: Injury[][] = [
  [],
  [{ zone: 'knee', severity: 'moderate' }],
  [{ zone: 'lowerBack', severity: 'severe' }],
  [{ zone: 'shoulder', severity: 'mild' }],
  [
    { zone: 'wrist', severity: 'moderate' },
    { zone: 'hip', severity: 'mild' },
    { zone: 'elbow', severity: 'mild' },
  ],
]

const PRESETS = Object.keys(EQUIPMENT_PRESETS) as EquipmentPreset[]

function assertValid(plan: Plan, profile: Profile, label: string) {
  const equipment = new Set<Equipment>(['bodyweight', ...profile.equipment])
  expect(plan.days, label).toHaveLength(profile.weekdays.length)

  for (const day of plan.days) {
    const ids = day.prescriptions.map((p) => p.exerciseId)
    expect(new Set(ids).size, `${label} ${day.id}: ejercicios repetidos`).toBe(ids.length)
    expect(
      day.estimatedMinutes,
      `${label} ${day.id}: ${day.estimatedMinutes} min > ${profile.minutesPerSession}`,
    ).toBeLessThanOrEqual(profile.minutesPerSession)

    for (const p of day.prescriptions) {
      for (const id of [p.exerciseId, ...p.alternatives]) {
        const e = byId.get(id)
        expect(e, `${label}: ${id} no existe`).toBeDefined()
        if (!e) continue
        expect(hasEquipment(e.equipment, equipment), `${label}: ${id} sin material`).toBe(true)
        for (const injury of profile.injuries) {
          expect(
            isContraindicated(e.jointStress[injury.zone], injury.severity),
            `${label}: ${id} contraindicado para ${injury.zone}/${injury.severity}`,
          ).toBe(false)
        }
        expect(
          LEVEL_RANK[e.level] - LEVEL_RANK[profile.level],
          `${label}: ${id} nivel`,
        ).toBeLessThanOrEqual(1)
      }
      expect(p.sets, `${label}: ${p.exerciseId} series`).toBeGreaterThanOrEqual(1)
      expect(p.sets).toBeLessThanOrEqual(5)
      expect(p.reps.min).toBeLessThanOrEqual(p.reps.max)
      expect(p.rir.min).toBeLessThanOrEqual(p.rir.max)
      expect(p.restSec).toBeGreaterThan(0)
    }
  }

  // Volumen: nunca muy por encima del máximo (el conteo fraccional permite algo de holgura en los
  // músculos que se trabajan de forma indirecta en los básicos).
  for (const m of MUSCLES) {
    const v = plan.volume[m]
    const cap = isDirect(m) ? v.max * 1.3 + 1.5 : v.max * 1.6 + 3
    expect(
      v.planned,
      `${label}: volumen de ${m} ${v.planned} > ${cap.toFixed(1)}`,
    ).toBeLessThanOrEqual(cap)
  }
}

describe('generatePlan: combinaciones exhaustivas', () => {
  for (const level of LEVELS) {
    for (const goal of GOALS) {
      it(`nivel ${level}, objetivo ${goal}`, () => {
        for (let days = 1; days <= 6; days++) {
          for (const preset of PRESETS) {
            for (const [i, injuries] of INJURY_SETS.entries()) {
              for (const minutes of [20, 45, 90]) {
                const profile = makeProfile({
                  level,
                  goal,
                  weekdays: DEFAULT_WEEKDAYS[days] as Weekday[],
                  equipment: [...EQUIPMENT_PRESETS[preset]],
                  injuries,
                  minutesPerSession: minutes,
                })
                const plan = generatePlan({ profile, catalog: CATALOG })
                assertValid(
                  plan,
                  profile,
                  `${level}/${goal}/${days}d/${preset}/les${i}/${minutes}min`,
                )
              }
            }
          }
        }
      })
    }
  }
})

describe('generatePlan: comportamiento', () => {
  it('es determinista', () => {
    const profile = makeProfile({ injuries: [{ zone: 'knee', severity: 'mild' }] })
    expect(generatePlan({ profile, catalog: CATALOG })).toEqual(
      generatePlan({ profile, catalog: CATALOG }),
    )
  })

  it('elige el split según días y nivel', () => {
    const split = (days: number, level: Profile['level']) =>
      generatePlan({
        catalog: CATALOG,
        profile: makeProfile({ level, weekdays: DEFAULT_WEEKDAYS[days] as Weekday[] }),
      }).split
    expect(split(1, 'beginner')).toBe('fullBody1')
    expect(split(2, 'advanced')).toBe('fullBody2')
    expect(split(3, 'beginner')).toBe('fullBody3')
    expect(split(3, 'intermediate')).toBe('upperLowerFull')
    expect(split(4, 'intermediate')).toBe('upperLower')
    expect(split(5, 'advanced')).toBe('upperLowerPushPull')
    expect(split(6, 'advanced')).toBe('pushPullLegs')
  })

  it('con gimnasio completo cubre los patrones básicos y el volumen mínimo de los grandes grupos', () => {
    const plan = generatePlan({
      catalog: CATALOG,
      profile: makeProfile({ weekdays: DEFAULT_WEEKDAYS[4] as Weekday[], minutesPerSession: 75 }),
    })
    const patterns = new Set(plan.days.flatMap((d) => d.prescriptions.map((p) => p.pattern)))
    for (const p of ['squat', 'hinge', 'horizontalPush', 'horizontalPull', 'verticalPull'] as const)
      expect(patterns.has(p), p).toBe(true)
    for (const m of ['chest', 'lats', 'quads', 'hamstrings'] as const)
      expect(plan.volume[m].planned, m).toBeGreaterThanOrEqual(plan.volume[m].min)
    expect(plan.warnings).toEqual([])
  })

  it('usa rangos de repeticiones según el objetivo', () => {
    const main = (goal: Profile['goal']) =>
      generatePlan({ catalog: CATALOG, profile: makeProfile({ goal }) }).days[0]!.prescriptions[0]!
    expect(main('strength').reps).toEqual({ min: 3, max: 6 })
    expect(main('hypertrophy').reps).toEqual({ min: 6, max: 10 })
    expect(main('endurance').reps.max).toBeGreaterThanOrEqual(20)
    expect(main('strength').restSec).toBeGreaterThan(main('endurance').restSec)
  })

  it('sin material para tracciones lo avisa', () => {
    const plan = generatePlan({
      catalog: CATALOG,
      profile: makeProfile({ equipment: [] }),
    })
    expect(plan.warnings.map((w) => w.key)).toContain('warnings.noPulling')
  })

  it('con lesiones avisa de consultar a un profesional y filtra ejercicios', () => {
    const plan = generatePlan({
      catalog: CATALOG,
      profile: makeProfile({ injuries: [{ zone: 'knee', severity: 'severe' }] }),
    })
    expect(plan.warnings).toContainEqual({
      key: 'warnings.consultProfessional',
      params: { zone: 'knee' },
    })
    const ids = plan.days.flatMap((d) => d.prescriptions.map((p) => p.exerciseId))
    expect(ids).not.toContain('barbell-squat')
  })

  it('una molestia del check-in se trata como lesión leve temporal', () => {
    const profile = makeProfile()
    const plan = generatePlan({
      catalog: CATALOG,
      profile,
      checkIn: { weekStart: '2026-09-21', energy: 3, sleep: 3, soreness: 3, pain: ['shoulder'] },
    })
    expect(plan.restrictions).toContainEqual({ zone: 'shoulder', severity: 'mild' })
    for (const id of plan.days.flatMap((d) => d.prescriptions.map((p) => p.exerciseId)))
      expect(byId.get(id)?.jointStress.shoulder).not.toBe('high')
  })

  it('en descarga reduce las series a la mitad y sube el RIR', () => {
    const profile = makeProfile()
    const normal = generatePlan({ catalog: CATALOG, profile })
    const deload = generatePlan({
      catalog: CATALOG,
      profile,
      mesocycle: { ...initialMesocycle('intermediate'), week: 5, deload: true, calibration: false },
    })
    expect(deload.weekKind).toBe('deload')
    const n = normal.days[0]!.prescriptions[0]!
    const d = deload.days[0]!.prescriptions[0]!
    expect(d.exerciseId).toBe(n.exerciseId)
    expect(d.sets).toBe(Math.ceil(n.sets / 2))
    expect(d.rir.min).toBe(n.rir.min + 2)
  })

  it('la primera semana es de calibración y sugiere carga a partir del historial después', () => {
    const profile = makeProfile()
    const first = generatePlan({ catalog: CATALOG, profile })
    expect(first.weekKind).toBe('calibration')
    const p = first.days[0]!.prescriptions[0]!
    expect(p.loadKg).toBeNull()
    expect(p.loadNote.key).toBe('load.calibrate')

    const history = [
      makeSession(
        p.exerciseId,
        Array.from({ length: p.sets }, () => ({ kg: 60, reps: p.reps.max, rir: 2 })),
        Date.UTC(2026, 8, 21),
      ),
    ]
    const next = generatePlan({
      catalog: CATALOG,
      profile,
      history,
      mesocycle: { ...initialMesocycle('intermediate'), week: 2, calibration: false },
    })
    const q = next.days[0]!.prescriptions.find((x) => x.exerciseId === p.exerciseId)!
    expect(q.loadKg).toBe(62.5)
    expect(q.loadNote.key).toBe('load.increase')
    expect(next.days[0]!.warmup.ramp.map((r) => r.kg)).toEqual([25, 37.5, 50])
  })

  it('el volumen sube con los pasos del mesociclo sin superar el máximo', () => {
    const profile = makeProfile({
      weekdays: DEFAULT_WEEKDAYS[5] as Weekday[],
      minutesPerSession: 90,
    })
    const base = generatePlan({ catalog: CATALOG, profile })
    const later = generatePlan({
      catalog: CATALOG,
      profile,
      mesocycle: {
        ...initialMesocycle('intermediate'),
        week: 4,
        volumeStep: 3,
        calibration: false,
      },
    })
    const total = (plan: Plan) =>
      plan.days.flatMap((d) => d.prescriptions).reduce((s, p) => s + p.sets, 0)
    expect(total(later)).toBeGreaterThan(total(base))
  })

  it('añade cardio al final si el objetivo lo pide y hay tiempo', () => {
    const plan = generatePlan({
      catalog: CATALOG,
      profile: makeProfile({ goal: 'fatLoss', minutesPerSession: 60 }),
    })
    expect(plan.days.every((d) => d.conditioning?.minutes === 15)).toBe(true)
    expect(plan.days[0]!.conditioning?.exerciseId).toBeTruthy()
    const short = generatePlan({
      catalog: CATALOG,
      profile: makeProfile({ goal: 'fatLoss', minutesPerSession: 40 }),
    })
    expect(short.days.every((d) => d.conditioning === null)).toBe(true)
    expect(short.reasons.map((r) => r.key)).toContain('reasons.cardio.restDays')
  })

  it('estima el gasto energético con Mifflin-St Jeor', () => {
    const plan = generatePlan({
      catalog: CATALOG,
      profile: makeProfile({ sex: 'male', weightKg: 80, heightCm: 180, age: 30, job: 'sedentary' }),
    })
    // 10·80 + 6,25·180 − 5·30 + 5 = 1780
    expect(plan.energy.bmr).toBe(1780)
    expect(plan.energy.tdee).toBeGreaterThan(plan.energy.bmr)
  })
})
