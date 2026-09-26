/**
 * Búsqueda y filtros de la biblioteca. Puro y testado: la búsqueda ignora mayúsculas y tildes
 * («press banca» encuentra «Press de banca») y busca también por músculo y material.
 */
import {
  hasEquipment,
  isContraindicated,
  type Equipment,
  type Exercise,
  type ExerciseContent,
  type Injury,
  type Level,
  type Muscle,
} from '@/domain'

export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface LibraryFilters {
  query: string
  muscle: Muscle | null
  level: Level | null
  /** Solo lo que se puede hacer con el material del perfil. */
  mine: boolean
  /** Solo lo compatible con las molestias del perfil. */
  safe: boolean
}

export const EMPTY_FILTERS: LibraryFilters = {
  query: '',
  muscle: null,
  level: null,
  mine: false,
  safe: false,
}

export interface LibraryContext {
  content: Readonly<Record<string, ExerciseContent>>
  /** Texto de búsqueda extra por ejercicio (nombres de músculos y material ya traducidos). */
  keywords: (exercise: Exercise) => string
  equipment: ReadonlySet<Equipment>
  injuries: readonly Injury[]
}

export function filterExercises(
  exercises: readonly Exercise[],
  filters: LibraryFilters,
  ctx: LibraryContext,
) {
  const words = normalize(filters.query).split(' ').filter(Boolean)
  const scored: { exercise: Exercise; rank: number }[] = []
  for (const e of exercises) {
    if (filters.muscle && !e.primaryMuscles.includes(filters.muscle)) continue
    if (filters.level && e.level !== filters.level) continue
    if (filters.mine && !hasEquipment(e.equipment, ctx.equipment)) continue
    if (
      filters.safe &&
      ctx.injuries.some((i) => isContraindicated(e.jointStress[i.zone], i.severity))
    )
      continue
    const name = normalize(ctx.content[e.id]?.name ?? e.id)
    let rank = 0
    if (words.length) {
      const haystack = `${name} ${normalize(ctx.keywords(e))}`
      if (!words.every((w) => haystack.includes(w))) continue
      // Primero lo que coincide en el nombre, y mejor si empieza por la búsqueda.
      if (words.every((w) => name.includes(w))) rank += 10
      if (name.startsWith(words[0]!)) rank += 5
    }
    rank += e.staple
    scored.push({ exercise: e, rank })
  }
  const collator = new Intl.Collator('es')
  return scored
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        collator.compare(
          ctx.content[a.exercise.id]?.name ?? '',
          ctx.content[b.exercise.id]?.name ?? '',
        ),
    )
    .map((s) => s.exercise)
}
