import { describe, expect, it } from 'vitest'

import catalog from '@/data/generated/exercises.json'
import content from '@/data/generated/exercises.es.json'
import type { Exercise } from '@/domain'

import { EMPTY_FILTERS, filterExercises, normalize, type LibraryContext } from './filter'

const exercises = catalog.exercises as Exercise[]
const ctx: LibraryContext = {
  content,
  keywords: (e) => e.primaryMuscles.join(' '),
  equipment: new Set(['dumbbell', 'bench']),
  injuries: [{ zone: 'knee', severity: 'severe' }],
}
const ids = (filters: Partial<typeof EMPTY_FILTERS>) =>
  filterExercises(exercises, { ...EMPTY_FILTERS, ...filters }, ctx).map((e) => e.id)

describe('biblioteca', () => {
  it('normaliza tildes, mayúsculas y signos', () => {
    expect(normalize('  Élévation  «lateral»! ')).toBe('elevation lateral')
  })

  it('busca sin tildes y con palabras en cualquier orden', () => {
    expect(ids({ query: 'press banca' })).toContain('barbell-bench-press-medium-grip')
    expect(ids({ query: 'banca press' })[0]).toMatch(/bench-press/)
    expect(ids({ query: 'jalon' }).length).toBeGreaterThan(0)
  })

  it('filtra por material propio y por molestias', () => {
    const mine = filterExercises(exercises, { ...EMPTY_FILTERS, mine: true }, ctx)
    expect(
      mine.every((e) => e.equipment.every((q) => ['bodyweight', 'dumbbell', 'bench'].includes(q))),
    ).toBe(true)
    const safe = filterExercises(exercises, { ...EMPTY_FILTERS, safe: true }, ctx)
    expect(safe.some((e) => e.id === 'barbell-squat')).toBe(false)
    expect(safe.length).toBeGreaterThan(100)
  })

  it('filtra por músculo principal', () => {
    const chest = filterExercises(exercises, { ...EMPTY_FILTERS, muscle: 'chest' }, ctx)
    expect(chest.every((e) => e.primaryMuscles.includes('chest'))).toBe(true)
    // Los básicos primero.
    expect(chest[0]?.staple).toBe(3)
  })
})
