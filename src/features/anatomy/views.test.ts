import { describe, expect, it } from 'vitest'

import { CATALOG } from '@/test/fixtures'

import { dominantView, exerciseHeat, sessionHeat } from './views'

const byId = new Map(CATALOG.map((e) => [e.id, e]))

describe('vistas anatómicas', () => {
  it('elige frente o espalda según los músculos', () => {
    expect(dominantView(['chest', 'frontDelts'])).toBe('front')
    expect(dominantView(['lats', 'upperBack', 'biceps'])).toBe('back')
  })

  it('resalta principales más que secundarios', () => {
    expect(exerciseHeat(['quads'], ['glutes', 'quads'])).toEqual({ quads: 4, glutes: 2 })
  })

  it('calcula el calor de una sesión por series', () => {
    const { heat, top } = sessionHeat([{ exerciseId: 'barbell-squat', sets: 4 }], byId)
    expect(heat.quads).toBe(3)
    expect(heat.glutes).toBe(2)
    expect(top[0]).toBe('quads')
  })
})
