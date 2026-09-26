import { describe, expect, it } from 'vitest'

import type { CheckIn } from '@/domain'

import { advanceWeek, initialMesocycle, MAX_VOLUME_STEP, MESOCYCLE_WEEKS } from './mesocycle'
import type { MesocycleState, WeekReview } from './types'

const review = (overrides: Partial<WeekReview> = {}): WeekReview => ({
  plannedSessions: 4,
  completedSessions: 4,
  averageRpe: 7,
  decliningLifts: 0,
  checkIn: null,
  ...overrides,
})

const state = (overrides: Partial<MesocycleState> = {}): MesocycleState => ({
  ...initialMesocycle('intermediate'),
  calibration: false,
  ...overrides,
})

const checkIn = (overrides: Partial<CheckIn> = {}): CheckIn => ({
  weekStart: '2026-09-21',
  energy: 4,
  sleep: 4,
  soreness: 2,
  pain: [],
  ...overrides,
})

describe('mesociclos', () => {
  it('duración según nivel (incluida la descarga)', () => {
    expect(MESOCYCLE_WEEKS).toEqual({ beginner: 7, intermediate: 5, advanced: 5 })
    expect(initialMesocycle('beginner')).toMatchObject({ week: 1, length: 7, calibration: true })
  })

  it('con adherencia ≥ 90 % y sin fatiga sube una serie por músculo', () => {
    const { next, reasons } = advanceWeek(state(), review(), 'intermediate')
    expect(next).toMatchObject({ week: 2, volumeStep: 1, deload: false, calibration: false })
    expect(reasons[0]?.key).toBe('reasons.adapt.increase')
  })

  it('no supera el máximo de pasos de volumen', () => {
    const { next } = advanceWeek(
      state({ volumeStep: MAX_VOLUME_STEP, week: 2 }),
      review(),
      'intermediate',
    )
    expect(next.volumeStep).toBe(MAX_VOLUME_STEP)
  })

  it('entre 70 y 90 % mantiene el volumen', () => {
    const { next, reasons } = advanceWeek(
      state({ volumeStep: 2, week: 2 }),
      review({ completedSessions: 3 }),
      'intermediate',
    )
    expect(next.volumeStep).toBe(2)
    expect(reasons[0]).toEqual({ key: 'reasons.adapt.holdAdherence', params: { percent: 75 } })
  })

  it('por debajo del 70 % reduce el volumen', () => {
    const { next } = advanceWeek(
      state({ volumeStep: 2, week: 2 }),
      review({ completedSessions: 2 }),
      'intermediate',
    )
    expect(next.volumeStep).toBe(1)
  })

  it('con señales de fatiga leves mantiene aunque la adherencia sea alta', () => {
    const { next, reasons } = advanceWeek(
      state({ week: 2 }),
      review({ checkIn: checkIn({ soreness: 4 }) }),
      'intermediate',
    )
    expect(next.volumeStep).toBe(0)
    expect(reasons[0]?.key).toBe('reasons.adapt.holdFatigue')
  })

  it('la última semana del mesociclo es de descarga', () => {
    const { next, reasons } = advanceWeek(state({ week: 4 }), review(), 'intermediate')
    expect(next).toMatchObject({ week: 5, deload: true })
    expect(reasons.map((r) => r.key)).toContain('reasons.adapt.plannedDeload')
  })

  it('descarga anticipada si el rendimiento cae, el RPE es muy alto o el check-in lo indica', () => {
    for (const r of [
      review({ decliningLifts: 2 }),
      review({ averageRpe: 9.5 }),
      review({ checkIn: checkIn({ energy: 1, sleep: 2 }) }),
      review({ checkIn: checkIn({ soreness: 5 }) }),
    ]) {
      const { next, reasons } = advanceWeek(state({ week: 2 }), r, 'intermediate')
      expect(next.deload).toBe(true)
      expect(reasons[0]?.key).toBe('reasons.adapt.earlyDeload')
    }
  })

  it('no anticipa la descarga en la primera semana', () => {
    const { next } = advanceWeek(state({ week: 1 }), review({ averageRpe: 9.5 }), 'intermediate')
    expect(next.deload).toBe(false)
  })

  it('tras la descarga empieza un mesociclo nuevo desde la base', () => {
    const { next, reasons } = advanceWeek(
      state({ week: 5, deload: true, volumeStep: 3 }),
      review(),
      'advanced',
    )
    expect(next).toEqual({
      index: 2,
      week: 1,
      length: 5,
      volumeStep: 0,
      deload: false,
      calibration: false,
    })
    expect(reasons[0]).toEqual({ key: 'reasons.adapt.newMesocycle', params: { index: 2 } })
  })
})
