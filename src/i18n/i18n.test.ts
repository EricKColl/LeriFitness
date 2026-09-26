import { describe, expect, it } from 'vitest'

import {
  DEFAULT_WEEKDAYS,
  EQUIPMENT,
  EQUIPMENT_PRESETS,
  GOALS,
  INJURY_SEVERITIES,
  INJURY_ZONES,
  JOB_TYPES,
  LEVELS,
  MUSCLES,
  PATTERNS,
  type EquipmentPreset,
  type Weekday,
} from '@/domain'
import { advanceWeek, generatePlan, initialMesocycle, TEMPLATES, type Reason } from '@/engine'
import { CATALOG, makeProfile } from '@/test/fixtures'

import es from './locales/es'

function lookup(root: unknown, path: string) {
  return path.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in node)
      return (node as Record<string, unknown>)[part]
    return undefined
  }, root)
}

describe('traducciones en español', () => {
  it('cubren todo el vocabulario del dominio', () => {
    const d = es.domain
    for (const m of MUSCLES) expect(d.muscles[m], m).toBeTruthy()
    for (const e of EQUIPMENT) expect(d.equipment[e], e).toBeTruthy()
    for (const p of PATTERNS) {
      expect(d.patterns[p], p).toBeTruthy()
      expect(d.patternMistakes[p].length, p).toBeGreaterThanOrEqual(2)
    }
    for (const z of INJURY_ZONES) expect(d.injuryZones[z], z).toBeTruthy()
    for (const s of INJURY_SEVERITIES) expect(d.severities[s], s).toBeTruthy()
    for (const l of LEVELS) expect(d.levels[l], l).toBeTruthy()
    for (const g of GOALS) expect(d.goals[g], g).toBeTruthy()
    for (const j of JOB_TYPES) expect(d.jobs[j], j).toBeTruthy()
    for (const t of Object.keys(TEMPLATES)) expect(lookup(es.engine, `days.${t}`), t).toBeTruthy()
  })

  it('tienen texto para todas las razones y avisos que produce el motor', () => {
    const keys = new Set<string>()
    const add = (list: Reason[]) => list.forEach((r) => keys.add(r.key))
    const presets = Object.keys(EQUIPMENT_PRESETS) as EquipmentPreset[]
    for (const goal of GOALS)
      for (const days of [1, 2, 3, 4, 5, 6])
        for (const preset of presets) {
          const plan = generatePlan({
            catalog: CATALOG,
            profile: makeProfile({
              goal,
              level: days === 3 ? 'beginner' : 'intermediate',
              weekdays: DEFAULT_WEEKDAYS[days] as Weekday[],
              equipment: [...EQUIPMENT_PRESETS[preset]],
              injuries: [{ zone: 'knee', severity: 'moderate' }],
              minutesPerSession: days * 15,
              age: 65,
              job: days % 2 ? 'physical' : 'sedentary',
            }),
            checkIn: { weekStart: '2026-09-21', energy: 3, sleep: 3, soreness: 3, pain: ['wrist'] },
          })
          add(plan.reasons)
          add(plan.warnings)
          plan.days.forEach((d) => d.prescriptions.forEach((p) => keys.add(p.loadNote.key)))
        }
    const review = {
      plannedSessions: 4,
      completedSessions: 4,
      averageRpe: 7,
      decliningLifts: 0,
      checkIn: null,
    }
    const s = { ...initialMesocycle('intermediate'), calibration: false, week: 2 }
    add(advanceWeek(s, review, 'intermediate').reasons)
    add(advanceWeek(s, { ...review, completedSessions: 3 }, 'intermediate').reasons)
    add(advanceWeek(s, { ...review, completedSessions: 1 }, 'intermediate').reasons)
    add(advanceWeek(s, { ...review, averageRpe: 8.6 }, 'intermediate').reasons)
    add(advanceWeek(s, { ...review, averageRpe: 9.6 }, 'intermediate').reasons)
    add(advanceWeek({ ...s, week: 4 }, review, 'intermediate').reasons)
    add(advanceWeek({ ...s, deload: true }, review, 'intermediate').reasons)
    for (const key of [
      'load.increase',
      'load.decrease',
      'load.repeat',
      'load.fromE1rm',
      'load.addReps',
      'load.harderVariant',
      'load.deload',
    ])
      keys.add(key)

    const missing = [...keys].filter((key) => typeof lookup(es.engine, key) !== 'string')
    expect(missing).toEqual([])
  })
})
