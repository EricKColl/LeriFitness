import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { ChevronRight, Search, SearchX, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { isMuscle, LEVELS, MUSCLES, type Exercise, type Level, type Profile } from '@/domain'
import { exerciseName, useCatalog, type Catalog } from '@/data/catalog'
import { useProfile } from '@/data/hooks'
import { useDynamicT } from '@/i18n/reason'
import { Chip } from '@/shared/ui/fields'
import { Input } from '@/shared/ui/input'
import { EmptyState, Page } from '@/shared/ui/page'

import { ExerciseThumb } from './exercise-image'
import { filterExercises, type LibraryFilters } from './filter'

const PAGE = 40

export function LibraryPage() {
  const profile = useProfile()
  if (profile === undefined) return null
  return <Library profile={profile} />
}

function useFilters(): [LibraryFilters, (patch: Partial<LibraryFilters>) => void] {
  const [params, setParams] = useSearchParams()
  const muscle = params.get('musculo')
  const level = params.get('nivel')
  const filters: LibraryFilters = {
    query: params.get('q') ?? '',
    muscle: muscle && isMuscle(muscle) ? muscle : null,
    level: LEVELS.includes(level as Level) ? (level as Level) : null,
    mine: params.get('material') === '1',
    safe: params.get('seguros') === '1',
  }
  const update = (patch: Partial<LibraryFilters>) => {
    const next = { ...filters, ...patch }
    const search = new URLSearchParams()
    if (next.query) search.set('q', next.query)
    if (next.muscle) search.set('musculo', next.muscle)
    if (next.level) search.set('nivel', next.level)
    if (next.mine) search.set('material', '1')
    if (next.safe) search.set('seguros', '1')
    // Escribir no crea entradas en el historial: «Atrás» vuelve a la pantalla anterior.
    setParams(search, { replace: true, preventScrollReset: true })
  }
  return [filters, update]
}

function Library({ profile }: { profile: Profile | null }) {
  const { t } = useTranslation(['library', 'domain', 'common'])
  const dt = useDynamicT()
  const catalog = useCatalog()
  const [filters, update] = useFilters()
  const deferred = useDeferredValue(filters)
  const injuries = profile?.injuries ?? []

  const results = filterExercises(catalog.exercises, deferred, {
    content: catalog.content,
    keywords: (e) =>
      [
        ...e.primaryMuscles.map((m) => dt(`domain:muscles.${m}`)),
        ...e.equipment.map((q) => dt(`domain:equipment.${q}`)),
      ].join(' '),
    equipment: new Set(['bodyweight', ...(profile?.equipment ?? [])]),
    injuries,
  })

  const [limit, setLimit] = useState(PAGE)
  const key = JSON.stringify(deferred)
  const [lastKey, setLastKey] = useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setLimit(PAGE)
  }

  return (
    <Page title={t('title')} subtitle={t('subtitle', { count: catalog.exercises.length })}>
      <div className="sticky top-0 z-20 -mx-5 bg-background/90 px-5 pt-safe pb-3 backdrop-blur-md">
        <div className="relative pt-2">
          <Search className="pointer-events-none absolute top-1/2 left-4 mt-1 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder={t('search')}
            aria-label={t('search')}
            className="rounded-2xl pr-12 pl-12 [&::-webkit-search-cancel-button]:appearance-none"
            enterKeyHint="search"
          />
          {filters.query && (
            <button
              type="button"
              aria-label={t('common:actions.clear')}
              onClick={() => update({ query: '' })}
              className="absolute top-1/2 right-1 mt-1 grid size-11 -translate-y-1/2 place-items-center rounded-full text-muted-foreground"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
        <div className="-mx-5 mt-3 scrollbar-none flex gap-2 overflow-x-auto px-5">
          {profile && (
            <Chip selected={filters.mine} onClick={() => update({ mine: !filters.mine })}>
              {t('filters.mine')}
            </Chip>
          )}
          {injuries.length > 0 && (
            <Chip selected={filters.safe} onClick={() => update({ safe: !filters.safe })}>
              {t('filters.safe')}
            </Chip>
          )}
          {LEVELS.map((level) => (
            <Chip
              key={level}
              selected={filters.level === level}
              onClick={() => update({ level: filters.level === level ? null : level })}
            >
              {t(`domain:levels.${level}`)}
            </Chip>
          ))}
        </div>
        <div
          role="group"
          aria-label={t('filters.muscle')}
          className="-mx-5 mt-2 scrollbar-none flex gap-2 overflow-x-auto px-5"
        >
          <Chip selected={filters.muscle === null} onClick={() => update({ muscle: null })}>
            {t('filters.all')}
          </Chip>
          {MUSCLES.map((m) => (
            <Chip
              key={m}
              selected={filters.muscle === m}
              onClick={() => update({ muscle: filters.muscle === m ? null : m })}
            >
              {t(`domain:muscles.${m}`)}
            </Chip>
          ))}
        </div>
      </div>

      <p className="mt-2 mb-3 text-sm text-muted-foreground" aria-live="polite">
        {t('results', { count: results.length })}
      </p>

      {results.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-7 text-muted-foreground" />}
          title={t('empty.title')}
          body={t('empty.body')}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {results.slice(0, limit).map((e) => (
            <li key={e.id}>
              <ExerciseRow exercise={e} catalog={catalog} />
            </li>
          ))}
        </ul>
      )}
      {limit < results.length && (
        <LoadMore key={limit} onVisible={() => setLimit((l) => l + PAGE)} />
      )}
    </Page>
  )
}

function ExerciseRow({ exercise: e, catalog }: { exercise: Exercise; catalog: Catalog }) {
  const { t } = useTranslation('domain')
  const muscles = e.primaryMuscles.map((m) => t(`muscles.${m}`)).join(', ')
  const equipment = e.equipment
    .filter((q) => q !== 'bodyweight' || e.equipment.length === 1)
    .map((q) => t(`equipment.${q}`))
    .join(', ')
  return (
    <Link
      to={`/ejercicios/${e.id}`}
      className="flex items-center gap-3.5 rounded-2xl p-2 transition-colors hover:bg-accent/50"
    >
      <ExerciseThumb exercise={e} className="size-16" />
      <div className="min-w-0 flex-1">
        <p className="leading-snug font-semibold">{exerciseName(catalog, e.id)}</p>
        <p className="truncate text-sm text-muted-foreground">{muscles}</p>
        <p className="truncate text-xs text-muted-foreground">
          {equipment} · {t(`levels.${e.level}`)}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  )
}

/** Centinela que carga más resultados al acercarse al final de la lista. */
function LoadMore({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const callback = useRef(onVisible)
  useEffect(() => {
    callback.current = onVisible
  })
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && callback.current(),
      { rootMargin: '600px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className="h-10" aria-hidden />
}
