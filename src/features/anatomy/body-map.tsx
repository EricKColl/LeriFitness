/**
 * Mapa muscular 2D (vista frontal y dorsal) en SVG. Cada región lleva `data-muscle` con el mismo
 * identificador que el dominio (y que los nodos del modelo 3D en la fase 2). Los colores salen de
 * la escala `--heat-0…5` del tema, así el mapa funciona en claro y oscuro.
 *
 * Solo se dibuja la mitad izquierda de cada músculo; la derecha es su reflejo.
 */
import { useTranslation } from 'react-i18next'

import type { Muscle } from '@/domain'
import { cn } from '@/shared/lib/utils'

export type HeatLevel = 0 | 1 | 2 | 3 | 4 | 5
export type View = 'front' | 'back'

const FRONT: Partial<Record<Muscle, string[]>> = {
  neck: ['M92 54 L100 56 L100 68 L90 66 Z'],
  traps: ['M90 62 L77 70 L92 70 Z'],
  sideDelts: ['M63 71 Q52 78 54 97 L60 95 Q60 82 67 74 Z'],
  frontDelts: ['M68 72 Q78 69 83 73 L78 90 Q69 93 61 95 Q61 81 68 72 Z'],
  chest: ['M99 74 L85 74 L80 90 Q79 104 88 108 Q96 110 99 106 Z'],
  biceps: ['M59 99 Q54 114 56 132 Q62 138 68 132 Q71 114 67 97 Z'],
  forearms: ['M55 139 Q48 160 50 190 L58 192 Q66 168 67 140 Q61 135 55 139 Z'],
  obliques: ['M79 110 Q76 140 80 168 L87 172 L87 113 Z'],
  abs: [
    'M89 112 L98.5 112 L98.5 128 L89 128 Z',
    'M89 130.5 L98.5 130.5 L98.5 146 L89 146 Z',
    'M89 148.5 L98.5 148.5 L98.5 162 L89 162 Z',
    'M89 164.5 L98.5 164.5 L98.5 180 Q92 180 89 174 Z',
  ],
  quads: ['M79 192 Q70 232 76 282 Q84 292 92 284 Q95 250 93 214 Q90 198 79 192 Z'],
  adductors: ['M99 198 L99 250 Q96 246 95 228 Q94 210 99 198 Z'],
  calves: ['M78 302 Q72 332 78 368 L86 368 Q92 332 90 302 Q84 297 78 302 Z'],
}

const BACK: Partial<Record<Muscle, string[]>> = {
  neck: ['M92 52 L100 54 L100 58 L93 60 Z'],
  traps: ['M100 56 L93 60 L75 70 Q89 80 100 112 Z'],
  sideDelts: ['M62 70 Q51 77 52 95 L56 95 Q56 80 65 72 Z'],
  rearDelts: ['M67 72 Q56 78 57 94 Q66 91 74 81 L73 72 Z'],
  triceps: ['M57 99 Q52 118 56 134 Q63 139 68 131 Q71 113 67 97 Z'],
  forearms: ['M55 139 Q48 160 50 190 L58 192 Q66 168 67 140 Q61 135 55 139 Z'],
  upperBack: ['M76 78 Q74 92 79 100 L92 97 Q91 88 86 81 Z'],
  lats: ['M78 102 Q76 126 87 150 L98.5 157 L98.5 118 L93 99 Z'],
  lowerBack: ['M89 153 L98.5 159 L98.5 182 L88 178 Z'],
  abductors: ['M77 176 Q71 188 75 202 L80 186 Z'],
  glutes: ['M80 181 Q75 200 82 212 Q93 217 99 209 L99 186 Q90 178 80 181 Z'],
  hamstrings: ['M79 217 Q74 251 80 284 L93 284 Q98 251 96 217 Q88 212 79 217 Z'],
  calves: ['M78 297 Q70 319 76 345 Q82 351 88 345 Q94 319 90 297 Q84 292 78 297 Z'],
}

/** Partes sin músculo asignado (cabeza, manos, rodillas, pies…), en tono neutro. */
const NEUTRAL: Record<View, string[]> = {
  front: [
    'M100 9 C88 9 83 19 83 31 C83 43 90 52 100 52 Z',
    'M52 194 Q46 204 50 214 Q56 216 59 206 L58 194 Z',
    'M79 286 Q78 296 83 300 L90 300 Q93 294 91 286 Q85 290 79 286 Z',
    'M78 370 Q74 380 80 386 L92 386 Q92 376 87 370 Z',
    'M81 178 Q90 186 100 188 L100 196 Q88 194 80 189 Z',
  ],
  back: [
    'M100 9 C88 9 83 19 83 31 C83 43 90 50 100 50 Z',
    'M52 194 Q46 204 50 214 Q56 216 59 206 L58 194 Z',
    'M80 286 Q79 292 81 295 L91 295 Q93 290 92 286 Z',
    'M80 347 Q78 362 80 372 L86 372 Q88 360 87 347 Z',
    'M79 374 Q76 382 80 386 L90 386 Q91 378 87 374 Z',
  ],
}

const MAP_MUSCLES: Record<View, Muscle[]> = {
  front: Object.keys(FRONT) as Muscle[],
  back: Object.keys(BACK) as Muscle[],
}

export function BodyMap({
  view,
  heat,
  onSelect,
  selected,
  className,
  label,
}: {
  view: View
  heat: Partial<Record<Muscle, HeatLevel>>
  onSelect?: (muscle: Muscle) => void
  selected?: Muscle | null
  className?: string
  label?: string
}) {
  const { t } = useTranslation('domain')
  const shapes = view === 'front' ? FRONT : BACK
  return (
    <svg
      viewBox="40 4 120 388"
      role={onSelect ? 'group' : 'img'}
      aria-label={label}
      className={cn('h-auto w-full', className)}
    >
      <g fill="var(--heat-0)" opacity="0.55">
        {NEUTRAL[view].map((d) => (
          <g key={d}>
            <path d={d} />
            <path d={d} transform="translate(200 0) scale(-1 1)" />
          </g>
        ))}
      </g>
      {(Object.entries(shapes) as [Muscle, string[]][]).map(([muscle, paths]) => {
        const level = heat[muscle] ?? 0
        const interactive = !!onSelect
        return (
          <g
            key={muscle}
            data-muscle={muscle}
            fill={`var(--heat-${level})`}
            stroke={selected === muscle ? 'var(--foreground)' : 'var(--background)'}
            strokeWidth={selected === muscle ? 1.6 : 0.9}
            strokeLinejoin="round"
            className={cn(
              'transition-[fill] duration-500',
              interactive &&
                'cursor-pointer outline-none hover:brightness-110 focus-visible:brightness-125',
            )}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? t(`muscles.${muscle}`) : undefined}
            aria-pressed={interactive ? selected === muscle : undefined}
            onClick={interactive ? () => onSelect(muscle) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(muscle)
                    }
                  }
                : undefined
            }
          >
            {interactive && <title>{t(`muscles.${muscle}`)}</title>}
            {paths.map((d) => (
              <g key={d}>
                <path d={d} />
                <path d={d} transform="translate(200 0) scale(-1 1)" />
              </g>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

/** Leyenda de la escala de calor. */
export function HeatLegend({ low, high }: { low: string; high: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{low}</span>
      <span className="flex flex-1 overflow-hidden rounded-full" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <span key={l} className="h-2 flex-1" style={{ background: `var(--heat-${l})` }} />
        ))}
      </span>
      <span>{high}</span>
    </div>
  )
}

/** Mapa para un ejercicio: principales intensos, secundarios suaves, en la vista que más muestra. */
export function ExerciseMuscleMap({
  primary,
  secondary,
  className,
}: {
  primary: readonly Muscle[]
  secondary: readonly Muscle[]
  className?: string
}) {
  const heat: Partial<Record<Muscle, HeatLevel>> = {}
  for (const m of secondary) heat[m] = 2
  for (const m of primary) heat[m] = 4
  const count = (view: View) => primary.filter((m) => MAP_MUSCLES[view].includes(m)).length
  const views: View[] = count('front') >= count('back') ? ['front', 'back'] : ['back', 'front']
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {views.map((v) => (
        <BodyMap key={v} view={v} heat={heat} />
      ))}
    </div>
  )
}
