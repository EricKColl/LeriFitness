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
