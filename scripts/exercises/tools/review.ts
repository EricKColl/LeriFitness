/**
 * Herramienta de control de calidad: lista los ejercicios agrupados por patrón inferido para
 * detectar clasificaciones erróneas.
 *
 *   npm run data:review                 resumen de todos los patrones
 *   npm run data:review -- squat,hinge  detalle de los patrones indicados
 */
import { inferPattern, mapCategory } from '../normalize'
import { loadSourceExercises } from '../source'

const only = process.argv[2]?.split(',')
const byPattern = new Map<string, string[]>()
for (const e of await loadSourceExercises()) {
  if (!e.images.length) continue
  const pattern = inferPattern(e)
  const category = mapCategory(e.category)
  const label = `${e.name} [${e.primaryMuscles[0]}${category !== 'strength' ? `,${category}` : ''}]`
  byPattern.set(pattern, [...(byPattern.get(pattern) ?? []), label])
}
for (const [pattern, names] of [...byPattern].sort(([a], [b]) => a.localeCompare(b))) {
  if (only && !only.includes(pattern)) console.log(`## ${pattern} (${names.length})`)
  else console.log(`\n## ${pattern} (${names.length})\n${names.join(' | ')}`)
}
