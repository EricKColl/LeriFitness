import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import catalogJson from '../../src/data/generated/exercises.json'
import esJson from '../../src/data/generated/exercises.es.json'
import { ExerciseCatalogSchema, ExerciseLocaleSchema, STRENGTH_PATTERNS } from '../../src/domain'

import { inferPattern, slugify } from './normalize'
import type { SourceExercise } from './source'

const catalog = ExerciseCatalogSchema.parse(catalogJson)
const ids = new Set(catalog.exercises.map((e) => e.id))

describe('catálogo de ejercicios generado', () => {
  it('cumple el esquema y no tiene ids duplicados', () => {
    expect(catalog.exercises.length).toBeGreaterThan(850)
    expect(ids.size).toBe(catalog.exercises.length)
  })

  it('las alternativas apuntan a ejercicios existentes y distintos', () => {
    for (const e of catalog.exercises) {
      for (const alt of e.alternatives) {
        expect(ids.has(alt), `${e.id} → ${alt}`).toBe(true)
        expect(alt).not.toBe(e.id)
      }
    }
  })

  it('todas las imágenes referenciadas existen en public/', () => {
    const missing = catalog.exercises
      .flatMap((e) => e.images)
      .filter((img) => !existsSync(resolve(import.meta.dirname, '../../public/exercises', img)))
    expect(missing).toEqual([])
  })

  it('hay básicos programables para cada patrón de fuerza principal', () => {
    const core = [
      'squat',
      'hinge',
      'lunge',
      'horizontalPush',
      'verticalPush',
      'horizontalPull',
      'verticalPull',
    ]
    for (const pattern of core) {
      const staples = catalog.exercises.filter((e) => e.pattern === pattern && e.staple >= 3)
      expect(staples.length, pattern).toBeGreaterThan(0)
      expect(STRENGTH_PATTERNS.has(staples[0]!.pattern)).toBe(true)
    }
  })

  it('el contenido en español solo contiene ids del catálogo', () => {
    const es = ExerciseLocaleSchema.parse(esJson)
    for (const id of Object.keys(es)) expect(ids.has(id), id).toBe(true)
  })

  it('los nombres en español son únicos', () => {
    const es = ExerciseLocaleSchema.parse(esJson)
    const byName = new Map<string, string[]>()
    for (const [id, content] of Object.entries(es)) {
      const key = content.name.toLocaleLowerCase('es')
      byName.set(key, [...(byName.get(key) ?? []), id])
    }
    const duplicated = [...byName].filter(([, list]) => list.length > 1)
    expect(duplicated).toEqual([])
  })

  it('el contenido en español sigue la guía de estilo', () => {
    const es = ExerciseLocaleSchema.parse(esJson)
    for (const [id, c] of Object.entries(es)) {
      expect(c.steps.length, id).toBeGreaterThanOrEqual(2)
      expect(c.steps.length, id).toBeLessThanOrEqual(6)
      expect(c.name[0], id).toBe(c.name[0]!.toLocaleUpperCase('es'))
      const texts = [c.name, ...c.steps, ...(c.tips ?? []), ...(c.mistakes ?? [])]
      for (const text of texts) {
        expect(text, id).not.toMatch(/"/)
        expect(text, id).not.toMatch(/\b(pulgadas?|libras?|onzas?|yardas?|millas?)\b/i)
      }
    }
  })

  it('los básicos que programa el motor (★2-3) tienen errores comunes propios', () => {
    const es = ExerciseLocaleSchema.parse(esJson)
    const missing = catalog.exercises
      .filter((e) => e.staple >= 2 && es[e.id] && !es[e.id]!.mistakes?.length)
      .map((e) => e.id)
    expect(missing).toEqual([])
  })

  it('las variantes no programables no son básicos del motor', () => {
    for (const id of ['squat-with-chains', 'neck-press', 'barbell-guillotine-bench-press']) {
      expect(catalog.exercises.find((e) => e.id === id)?.staple, id).toBe(0)
    }
  })

  it('el leñador en polea no se clasifica como salto', () => {
    const woodChop = catalog.exercises.find((e) => e.id === 'standing-cable-wood-chop')
    expect(woodChop?.jointStress.knee).toBeUndefined()
    expect(woodChop?.jointStress.ankle).toBeUndefined()
  })
})

describe('normalización', () => {
  const base: SourceExercise = {
    id: 'X',
    name: 'X',
    force: 'push',
    level: 'beginner',
    mechanic: 'compound',
    equipment: 'barbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    instructions: [],
    category: 'strength',
    images: [],
  }

  it('genera slugs en kebab-case', () => {
    expect(slugify('Barbell_Bench_Press_-_Medium_Grip')).toBe('barbell-bench-press-medium-grip')
    expect(slugify("Farmer's_Walk")).toBe('farmer-s-walk')
  })

  it('clasifica patrones básicos por nombre y músculo', () => {
    expect(inferPattern({ ...base, name: 'Barbell Bench Press' })).toBe('horizontalPush')
    expect(
      inferPattern({ ...base, name: 'Face Pull', primaryMuscles: ['shoulders'], force: 'pull' }),
    ).toBe('rearDelt')
    expect(
      inferPattern({ ...base, name: 'Romanian Deadlift', primaryMuscles: ['hamstrings'] }),
    ).toBe('hinge')
    expect(inferPattern({ ...base, name: 'Power Clean', primaryMuscles: ['hamstrings'] })).toBe(
      'olympic',
    )
    expect(
      inferPattern({ ...base, name: 'Mixed Grip Chin', primaryMuscles: ['middle back'] }),
    ).toBe('verticalPull')
  })
})
