/**
 * Herramienta de control de calidad: lista los ejercicios agrupados por patrón para detectar
 * clasificaciones erróneas. Muestra la clasificación FINAL (reglas + `overrides.ts`) del catálogo
 * generado; `*` marca los que tienen corrección manual y `★n` los básicos.
 *
 *   npm run data:review                 resumen de todos los patrones
 *   npm run data:review -- squat,hinge  detalle de los patrones indicados
 */
import catalogJson from '../../../src/data/generated/exercises.json'
import { ExerciseCatalogSchema } from '../../../src/domain'
import { OVERRIDES } from '../overrides'

const only = process.argv[2]?.split(',')
const { exercises } = ExerciseCatalogSchema.parse(catalogJson)
const byPattern = new Map<string, string[]>()
for (const e of exercises) {
  const stress = Object.entries(e.jointStress)
    .map(([zone, level]) => `${zone}:${level[0]}`)
    .join(' ')
  const label = `${e.id}${OVERRIDES[e.id] ? '*' : ''}${e.staple ? ` ★${e.staple}` : ''} [${e.primaryMuscles.join(',')}${e.category !== 'strength' ? `; ${e.category}` : ''}; ${e.level[0]}; ${e.equipment.join('+')}; ${stress}]`
  byPattern.set(e.pattern, [...(byPattern.get(e.pattern) ?? []), label])
}
for (const [pattern, names] of [...byPattern].sort(([a], [b]) => a.localeCompare(b))) {
  if (only && !only.includes(pattern)) console.log(`## ${pattern} (${names.length})`)
  else console.log(`\n## ${pattern} (${names.length})\n${names.join('\n')}`)
}
