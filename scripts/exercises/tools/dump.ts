/**
 * Herramienta de redacción: vuelca en texto compacto los ejercicios de origen (en inglés) para
 * redactar su contenido en español por lotes.
 *
 *   npm run data:dump -- <inicio> <cantidad>       p. ej. npm run data:dump -- 300 50
 *   npm run data:dump -- --missing es 50           los 50 primeros aún sin contenido en «es»
 *
 * Formato: `sourceId | nombre [★n si es básico] | patrón/material` (clasificación final del
 * catálogo generado) y debajo las instrucciones.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import catalogJson from '../../../src/data/generated/exercises.json'
import { ExerciseCatalogSchema } from '../../../src/domain'
import { slugify } from '../normalize'
import { loadSourceExercises } from '../source'

const catalog = new Map(
  ExerciseCatalogSchema.parse(catalogJson).exercises.map((e) => [e.sourceId, e]),
)

const args = process.argv.slice(2)
const all = (await loadSourceExercises())
  .filter((e) => e.images.length > 0)
  .sort((a, b) => slugify(a.id).localeCompare(slugify(b.id)))

let selection: typeof all
if (args[0] === '--missing') {
  const locale = args[1] ?? 'es'
  const dir = resolve(import.meta.dirname, '../content', locale)
  const done = new Set<string>()
  if (existsSync(dir)) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const json = JSON.parse(readFileSync(resolve(dir, file), 'utf8')) as Record<string, unknown>
      Object.keys(json).forEach((k) => done.add(k))
    }
  }
  selection = all.filter((e) => !done.has(e.id)).slice(0, Number(args[2] ?? 50))
  console.log(`# ${all.length - done.size} ejercicios pendientes en «${locale}»\n`)
} else {
  const [offset = 0, count = 50] = args.map(Number)
  selection = all.slice(offset, offset + count)
}

for (const e of selection) {
  const exercise = catalog.get(e.id)
  const staple = exercise?.staple ?? 0
  const star = staple >= 2 ? ` ★${staple}` : ''
  console.log(`${e.id} | ${e.name}${star} | ${exercise?.pattern}/${exercise?.equipment.join('+')}`)
  console.log(`  ${e.instructions.join(' / ').replace(/\s+/g, ' ')}`)
}
