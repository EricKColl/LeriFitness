/**
 * Genera la base de ejercicios de Forja de forma reproducible.
 *
 *   npm run data:exercises               → datos + imágenes
 *   npm run data:exercises -- --no-images → solo datos
 *
 * Entradas: free-exercise-db (commit fijado), `overrides.ts`, `content/<idioma>/*.json`.
 * Salidas:  `src/data/generated/exercises.json`, `src/data/generated/exercises.<idioma>.json`
 *           y `public/exercises/<id>/<n>.webp`.
 */
import { existsSync, readdirSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import sharp from 'sharp'
import { z } from 'zod'

import {
  ExerciseCatalogSchema,
  ExerciseContentSchema,
  ExerciseSchema,
  STRENGTH_PATTERNS,
  type Exercise,
  type ExerciseContent,
} from '../../src/domain'

import {
  inferJointStress,
  inferPattern,
  inferUnilateral,
  mapCategory,
  mapEquipment,
  mapLevel,
  mapMuscles,
  slugify,
} from './normalize'
import { OVERRIDES, STAPLES } from './overrides'
import { CACHE_DIR, ensureSource, loadSourceExercises, SOURCE, type SourceExercise } from './source'

const ROOT = resolve(import.meta.dirname, '../..')
const OUT_DATA = resolve(ROOT, 'src/data/generated')
const OUT_IMAGES = resolve(ROOT, 'public/exercises')
const CONTENT_DIR = resolve(import.meta.dirname, 'content')
const LOCALES = ['es'] as const
const CATALOG_VERSION = '1'

const args = new Set(process.argv.slice(2))
const withImages = !args.has('--no-images')

function toExercise(src: SourceExercise): Omit<Exercise, 'alternatives'> {
  const id = slugify(src.id)
  const override = OVERRIDES[id] ?? {}
  const category = mapCategory(src.category)
  const pattern = override.pattern ?? inferPattern(src)
  const muscles = mapMuscles(src, pattern)
  const primaryMuscles = override.primaryMuscles ?? muscles.primaryMuscles
  const secondaryMuscles = (override.secondaryMuscles ?? muscles.secondaryMuscles).filter(
    (m) => !primaryMuscles.includes(m),
  )
  const programmable =
    (category === 'strength' || category === 'powerlifting') && STRENGTH_PATTERNS.has(pattern)

  return {
    id,
    sourceId: src.id,
    category,
    level: mapLevel(src.level),
    mechanic: src.mechanic,
    force: src.force,
    pattern,
    equipment: override.equipment ?? mapEquipment(src, pattern),
    primaryMuscles,
    secondaryMuscles,
    jointStress: { ...inferJointStress(src, pattern, primaryMuscles), ...override.jointStress },
    unilateral: override.unilateral ?? inferUnilateral(src, pattern),
    staple: STAPLES[id] ?? (programmable && src.level !== 'expert' ? 1 : 0),
    images: src.images.map((_, i) => `${id}/${i}.webp`),
  }
}

/** Alternativas: mismo patrón y/o mismos músculos principales, ordenadas por parecido. */
function computeAlternatives(all: Omit<Exercise, 'alternatives'>[]) {
  const isTraining = (e: { category: string }) => e.category !== 'stretching'
  return new Map(
    all.map((a) => {
      const scored = all
        .filter((b) => b.id !== a.id && isTraining(a) === isTraining(b))
        .map((b) => {
          const primaryOverlap = b.primaryMuscles.filter((m) => a.primaryMuscles.includes(m)).length
          const secondaryOverlap = b.secondaryMuscles.filter((m) =>
            a.secondaryMuscles.includes(m),
          ).length
          const samePattern = a.pattern === b.pattern
          if (!samePattern && primaryOverlap === 0) return null
          if (
            !samePattern &&
            a.pattern !== 'mobility' &&
            ['mobility', 'other', 'olympic'].includes(b.pattern)
          )
            return null
          const score =
            (samePattern ? 10 : 0) +
            primaryOverlap * 4 +
            secondaryOverlap +
            b.staple * 1.5 +
            (a.category === b.category ? 1 : 0)
          return { id: b.id, score }
        })
        .filter((x): x is { id: string; score: number } => x !== null)
        .sort((x, y) => y.score - x.score || x.id.localeCompare(y.id))
      return [a.id, scored.slice(0, 6).map((x) => x.id)] as const
    }),
  )
}

async function loadContent(locale: string) {
  const dir = resolve(CONTENT_DIR, locale)
  const files = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .sort()
    : []
  const content: Record<string, ExerciseContent> = {}
  for (const file of files) {
    const raw: unknown = JSON.parse(await readFile(resolve(dir, file), 'utf8'))
    const parsed = z.record(z.string(), ExerciseContentSchema).safeParse(raw)
    if (!parsed.success) throw new Error(`${locale}/${file}: ${z.prettifyError(parsed.error)}`)
    for (const [sourceId, value] of Object.entries(parsed.data)) {
      if (content[sourceId]) throw new Error(`${locale}/${file}: «${sourceId}» duplicado`)
      content[sourceId] = value
    }
  }
  return content
}

async function convertImages(pairs: { from: string; to: string }[]) {
  let done = 0
  let skipped = 0
  // Las imágenes ya generadas están versionadas: solo se descarga el origen si falta alguna.
  if (pairs.some((p) => !existsSync(p.to))) await ensureSource()
  const queue = [...pairs]
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      if (existsSync(job.to)) {
        skipped++
        continue
      }
      await mkdir(resolve(job.to, '..'), { recursive: true })
      await sharp(job.from)
        .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 68, effort: 5 })
        .toFile(job.to)
      done++
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  console.log(`✓ Imágenes: ${done} convertidas, ${skipped} ya existían`)
}

async function main() {
  const source = (await loadSourceExercises()).filter((e) => e.images.length > 0)
  const partial = source.map(toExercise)

  const ids = new Set<string>()
  for (const e of partial) {
    if (ids.has(e.id)) throw new Error(`Id duplicado tras normalizar: ${e.id}`)
    ids.add(e.id)
  }
  for (const key of [...Object.keys(STAPLES), ...Object.keys(OVERRIDES)]) {
    if (!ids.has(key))
      throw new Error(`overrides.ts hace referencia a un ejercicio inexistente: ${key}`)
  }

  const alternatives = computeAlternatives(partial)
  const exercises = partial
    .map((e) => ExerciseSchema.parse({ ...e, alternatives: alternatives.get(e.id) ?? [] }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const catalog = ExerciseCatalogSchema.parse({
    version: CATALOG_VERSION,
    source: SOURCE,
    exercises,
  })
  await mkdir(OUT_DATA, { recursive: true })
  await writeFile(resolve(OUT_DATA, 'exercises.json'), JSON.stringify(catalog) + '\n')
  console.log(`✓ Catálogo: ${exercises.length} ejercicios`)

  for (const locale of LOCALES) {
    const content = await loadContent(locale)
    const bySourceId = new Map(exercises.map((e) => [e.sourceId, e.id]))
    const unknown = Object.keys(content).filter((k) => !bySourceId.has(k))
    if (unknown.length)
      throw new Error(`${locale}: contenido para ids desconocidos: ${unknown.join(', ')}`)
    const missing = exercises.filter((e) => !content[e.sourceId])
    if (missing.length) {
      const message = `${locale}: faltan ${missing.length} ejercicios sin traducir (p. ej. ${missing
        .slice(0, 5)
        .map((e) => e.sourceId)
        .join(', ')})`
      if (args.has('--allow-missing')) console.warn(`⚠ ${message}`)
      else throw new Error(message)
    }
    const localized = Object.fromEntries(
      exercises.filter((e) => content[e.sourceId]).map((e) => [e.id, content[e.sourceId]]),
    )
    await writeFile(resolve(OUT_DATA, `exercises.${locale}.json`), JSON.stringify(localized) + '\n')
    console.log(`✓ Contenido ${locale}: ${Object.keys(localized).length} ejercicios`)
  }

  if (withImages) {
    await convertImages(
      source.flatMap((src) =>
        src.images.map((image, i) => ({
          from: resolve(CACHE_DIR, 'exercises', image),
          to: resolve(OUT_IMAGES, slugify(src.id), `${i}.webp`),
        })),
      ),
    )
  }
}

await main()
