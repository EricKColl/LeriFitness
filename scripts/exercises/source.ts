/**
 * Descarga free-exercise-db en un commit FIJADO y lo cachea en `.cache/`.
 * Fijar el commit hace que la generación sea reproducible bit a bit.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import * as tar from 'tar'
import { z } from 'zod'

export const SOURCE = {
  name: 'free-exercise-db',
  url: 'https://github.com/yuhonas/free-exercise-db',
  commit: 'a859101d633a01c4a1a920d6a8ce41dabba0705f',
  license: 'Unlicense (dominio público)',
} as const

const ROOT = resolve(import.meta.dirname, '../..')
export const CACHE_DIR = resolve(ROOT, '.cache', `free-exercise-db-${SOURCE.commit.slice(0, 7)}`)

export const SourceExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  force: z.enum(['push', 'pull', 'static']).nullable(),
  level: z.enum(['beginner', 'intermediate', 'expert']),
  mechanic: z.enum(['compound', 'isolation']).nullable(),
  equipment: z.string().nullable(),
  primaryMuscles: z.array(z.string()).min(1),
  secondaryMuscles: z.array(z.string()),
  instructions: z.array(z.string()),
  category: z.string(),
  images: z.array(z.string()),
})

export type SourceExercise = z.infer<typeof SourceExerciseSchema>

export async function ensureSource() {
  const marker = resolve(CACHE_DIR, 'dist', 'exercises.json')
  if (existsSync(marker)) return CACHE_DIR

  await mkdir(CACHE_DIR, { recursive: true })
  const url = `https://codeload.github.com/yuhonas/free-exercise-db/tar.gz/${SOURCE.commit}`
  console.log(`↓ Descargando ${url}`)
  const response = await fetch(url)
  if (!response.ok || !response.body) throw new Error(`Descarga fallida: ${response.status}`)

  await pipeline(
    Readable.fromWeb(response.body),
    tar.x({
      cwd: CACHE_DIR,
      strip: 1,
      filter: (path) => /\/(dist\/exercises\.json|exercises\/.+\.jpg)$/.test(path),
    }),
  )
  return CACHE_DIR
}

export async function loadSourceExercises(): Promise<SourceExercise[]> {
  const dir = await ensureSource()
  const raw: unknown = JSON.parse(await readFile(resolve(dir, 'dist', 'exercises.json'), 'utf8'))
  return z.array(SourceExerciseSchema).parse(raw)
}
