import { describe, expect, it } from 'vitest'

import { setBounds, setScheme } from './prescription'
import { BASE_VOLUME, volumeRanges, weeklyTargets } from './volume'

const base = { level: 'intermediate', goal: 'hypertrophy', age: 30, job: 'active' } as const

describe('volumen semanal', () => {
  it('intermedio con hipertrofia usa los rangos base', () => {
    expect(volumeRanges(base).chest).toEqual(BASE_VOLUME.chest)
  })

  it('aplica multiplicadores de nivel y objetivo', () => {
    expect(volumeRanges({ ...base, level: 'beginner' }).chest).toEqual({ min: 6, max: 9.6 })
    expect(volumeRanges({ ...base, level: 'advanced' }).chest).toEqual({ min: 12, max: 19.2 })
    expect(volumeRanges({ ...base, goal: 'health' }).chest).toEqual({ min: 6, max: 9.6 })
  })

  it('reduce con la edad y en el tren inferior con trabajo físico', () => {
    expect(volumeRanges({ ...base, age: 65 }).chest.max).toBeCloseTo(14.4)
    const physical = volumeRanges({ ...base, job: 'physical' })
    expect(physical.quads.max).toBeCloseTo(13.6)
    expect(physical.chest).toEqual(BASE_VOLUME.chest)
  })

  it('con trabajo sedentario da más énfasis a espalda alta, deltoides posterior y glúteos', () => {
    const sedentary = volumeRanges({ ...base, job: 'sedentary' })
    expect(sedentary.upperBack.min).toBeGreaterThan(BASE_VOLUME.upperBack.min)
    expect(sedentary.glutes.max).toBeGreaterThan(BASE_VOLUME.glutes.max)
  })

  it('el objetivo parte cerca del mínimo y sube por pasos sin pasar del máximo', () => {
    const ranges = volumeRanges(base)
    const t0 = weeklyTargets(ranges, 0)
    expect(t0.chest).toBeCloseTo(10 + 6 * 0.35)
    expect(weeklyTargets(ranges, 2).chest).toBeCloseTo(t0.chest + 2)
    expect(weeklyTargets(ranges, 50).chest).toBe(16)
    // Músculos de trabajo indirecto: sin objetivo propio
    expect(t0.frontDelts).toBe(0)
  })
})

describe('series, repeticiones y descansos', () => {
  const compound = { mechanic: 'compound', force: 'push', pattern: 'horizontalPush' } as const
  const isolation = { mechanic: 'isolation', force: 'pull', pattern: 'elbowFlexion' } as const
  const plank = { mechanic: 'compound', force: 'static', pattern: 'coreAntiExtension' } as const

  it('fuerza: básicos a 3-6 repeticiones con descansos largos', () => {
    expect(setScheme('strength', 'intermediate', 'main', compound)).toEqual({
      reps: { min: 3, max: 6 },
      rir: { min: 1, max: 3 },
      restSec: 210,
      unit: 'reps',
    })
  })

  it('hipertrofia: compuestos 6-10 y aislamientos 10-15', () => {
    expect(setScheme('hypertrophy', 'advanced', 'main', compound).reps).toEqual({ min: 6, max: 10 })
    expect(setScheme('hypertrophy', 'advanced', 'accessory', isolation).reps).toEqual({
      min: 10,
      max: 15,
    })
  })

  it('principiantes con más reserva', () => {
    expect(setScheme('hypertrophy', 'beginner', 'main', compound).rir).toEqual({ min: 2, max: 3 })
  })

  it('isométricos en segundos', () => {
    const s = setScheme('health', 'beginner', 'accessory', plank)
    expect(s.unit).toBe('seconds')
    expect(s.reps.min).toBeGreaterThanOrEqual(20)
  })

  it('peso corporal: rangos altos aunque el objetivo sea fuerza', () => {
    expect(
      setScheme('strength', 'advanced', 'main', compound, false).reps.max,
    ).toBeGreaterThanOrEqual(12)
  })

  it('entre 2 y 5 series por hueco', () => {
    expect(setBounds('main', 'strength', 'advanced')).toEqual({ min: 3, start: 3, max: 5 })
    expect(setBounds('accessory', 'hypertrophy', 'beginner')).toEqual({ min: 2, start: 2, max: 4 })
  })
})
