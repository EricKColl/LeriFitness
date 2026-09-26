/**
 * Catálogo de ejercicios con carga perezosa: los JSON generados se importan de forma dinámica, así
 * Vite los emite como fragmentos con hash que el service worker precachea para uso sin conexión.
 */
import { use } from 'react'

import type { Exercise, ExerciseContent } from '@/domain'

export interface Catalog {
  exercises: Exercise[]
  byId: ReadonlyMap<string, Exercise>
  content: Readonly<Record<string, ExerciseContent>>
  version: string
}

let pending: Promise<Catalog> | null = null

export function loadCatalog(): Promise<Catalog> {
  pending ??= Promise.all([
    import('./generated/exercises.json'),
    import('./generated/exercises.es.json'),
  ]).then(([catalog, content]) => {
    // Los datos se validan con Zod al generarlos (scripts/exercises/build.ts y sus tests):
    // aquí se confía en ellos para no pagar la validación en cada arranque.
    const exercises = catalog.default.exercises as Exercise[]
    return {
      exercises,
      byId: new Map(exercises.map((e) => [e.id, e])),
      content: content.default as Record<string, ExerciseContent>,
      version: catalog.default.version,
    }
  })
  return pending
}

/** Hook que suspende hasta tener el catálogo (usar dentro de `<Suspense>`). */
export function useCatalog() {
  return use(loadCatalog())
}

export function exerciseName(catalog: Catalog, id: string) {
  return catalog.content[id]?.name ?? id
}

/** Ruta pública de una imagen de ejercicio. */
export function exerciseImage(path: string) {
  return `/exercises/${path}`
}
