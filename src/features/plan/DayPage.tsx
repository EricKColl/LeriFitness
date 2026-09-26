import { ChevronRight, Flame, Link2, Play, Repeat2, Timer, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import type { PlanDay, Prescription } from '@/engine'
import { exerciseName, useCatalog, type Catalog } from '@/data/catalog'
import { useActivePlan } from '@/data/hooks'
import { AnatomyView } from '@/features/anatomy/anatomy-view'
import { BodyMap } from '@/features/anatomy/body-map'
import { dominantView, sessionHeat } from '@/features/anatomy/views'
import { ExerciseThumb } from '@/features/library/exercise-image'
import { useDynamicT, useReasonText } from '@/i18n/reason'
import { formatKg, formatRest } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EmptyState, Page, Section } from '@/shared/ui/page'

export function DayPage() {
  const { dayId } = useParams()
  const planRow = useActivePlan()
  const { t } = useTranslation('plan')
  if (planRow === undefined) return null
  const day = planRow?.plan.days.find((d) => d.id === dayId)
  if (!day)
    return (
      <Page back="/plan">
        <EmptyState title={t('day.notFound')} />
      </Page>
    )
  return <DayView day={day} restricted={(planRow?.plan.restrictions.length ?? 0) > 0} />
}

function DayView({ day, restricted }: { day: PlanDay; restricted: boolean }) {
  const { t } = useTranslation(['plan', 'engine', 'common'])
  const dt = useDynamicT()
  const catalog = useCatalog()
  const name = (id: string) => exerciseName(catalog, id)
  const { warmup, conditioning } = day
  const sets = day.prescriptions.reduce((sum, p) => sum + p.sets, 0)

  return (
    <Page
      back="/plan"
      eyebrow={`~${day.estimatedMinutes} min · ${t('common:units.sets', { count: sets })}`}
      title={dt(`engine:days.${day.template}`)}
      subtitle={dt(`engine:dayFocus.${day.template}`)}
    >
      {restricted && (
        <p className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <TriangleAlert className="size-5 shrink-0 text-warning" />
          {t('day.injuryNote')}
        </p>
      )}

      <DayMuscles day={day} catalog={catalog} />

      <Section title={t('day.warmup')}>
        <div className="surface flex flex-col gap-3 p-4 text-sm">
          <p className="flex items-center gap-2">
            <Flame className="size-4 text-primary" />
            {t('day.general', { minutes: warmup.generalMinutes })}
          </p>
          {warmup.rampExerciseId && warmup.ramp.length > 0 && (
            <div>
              <p className="font-medium">
                {t('day.ramp', { exercise: name(warmup.rampExerciseId) })}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {warmup.ramp.map((s, i) => (
                  <li key={i} className="rounded-full bg-secondary px-3 py-1 tabular-nums">
                    {s.kg !== null
                      ? t('day.rampSet', { reps: s.reps, kg: formatKg(s.kg) })
                      : t('day.rampSetPercent', { reps: s.reps, percent: s.percent })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      <Section title={t('day.exercises')}>
        <ol className="flex flex-col gap-2.5">
          {day.prescriptions.map((p, i) => (
            <li key={p.slotId}>
              <PrescriptionCard
                index={i + 1}
                prescription={p}
                catalog={catalog}
                partner={
                  p.supersetWith
                    ? day.prescriptions.find((o) => o.slotId === p.supersetWith)
                    : undefined
                }
              />
            </li>
          ))}
        </ol>
      </Section>

      {conditioning && (
        <Section title={t('day.conditioning')}>
          <div className="surface flex items-center gap-4 p-4">
            {conditioning.exerciseId ? (
              <ExerciseThumb exercise={catalog.byId.get(conditioning.exerciseId)} />
            ) : (
              <span className="grid size-14 place-items-center rounded-xl bg-steel-soft text-steel">
                <Timer className="size-6" />
              </span>
            )}
            <div>
              <p className="font-semibold">
                {conditioning.exerciseId ? name(conditioning.exerciseId) : t('day.outdoorWalk')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('day.conditioningBody', {
                  minutes: conditioning.minutes,
                  intensity: t(`engine:cardioIntensity.${conditioning.intensity}`).toLowerCase(),
                })}
              </p>
            </div>
          </div>
        </Section>
      )}

      <div className="sticky bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+5.25rem)] z-10 mt-7">
        <Button asChild size="xl" className="w-full shadow-xl">
          <Link to={`/sesion/${day.id}`}>
            <Play className="fill-current" />
            {t('day.start')}
          </Link>
        </Button>
      </div>
    </Page>
  )
}

function PrescriptionCard({
  index,
  prescription: p,
  catalog,
  partner,
}: {
  index: number
  prescription: Prescription
  catalog: Catalog
  partner?: Prescription
}) {
  const { t } = useTranslation(['plan', 'engine', 'domain'])
  const reasonText = useReasonText((id) => exerciseName(catalog, id))
  const range = (r: { min: number; max: number }) =>
    r.min === r.max ? { min: r.min, max: r.max, one: true } : { ...r, one: false }
  const rir = range(p.rir)
  return (
    <Link
      to={`/ejercicios/${p.exerciseId}`}
      className={cn(
        'surface flex gap-3.5 p-3.5 transition-colors hover:bg-accent/40',
        partner && 'border-l-4 border-l-steel',
      )}
    >
      <div className="relative">
        <ExerciseThumb exercise={catalog.byId.get(p.exerciseId)} className="size-16" />
        <span className="absolute -top-1.5 -left-1.5 grid size-6 place-items-center rounded-full bg-foreground text-xs font-bold text-background">
          {index}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="leading-snug font-semibold">{exerciseName(catalog, p.exerciseId)}</p>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="font-display text-lg font-extrabold tabular-nums">
            {t(p.unit === 'seconds' ? 'day.setsSeconds' : 'day.sets', {
              sets: p.sets,
              min: p.reps.min,
              max: p.reps.max,
            })}
          </span>
          {p.loadKg !== null && (
            <Badge variant="ember" className="tabular-nums">
              {t('day.load', { kg: formatKg(p.loadKg) })}
            </Badge>
          )}
          {p.role === 'main' && <Badge variant="secondary">{t('engine:roles.main')}</Badge>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {rir.one
            ? t('day.rirOne', { min: rir.min })
            : t('day.rir', { min: rir.min, max: rir.max })}{' '}
          · {t('day.rest', { time: formatRest(p.restSec) })}
        </p>
        <p className="mt-1.5 text-xs">{reasonText(p.loadNote)}</p>
        {partner && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-steel">
            <Link2 className="size-3.5" />
            {t('day.supersetWith', { exercise: exerciseName(catalog, partner.exerciseId) })}
          </p>
        )}
        {p.substitutedFrom && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Repeat2 className="size-3.5" />
            {t('day.substituted', {
              pattern: t(`domain:patterns.${p.substitutedFrom}`).toLowerCase(),
            })}
          </p>
        )}
      </div>
    </Link>
  )
}

function DayMuscles({ day, catalog }: { day: PlanDay; catalog: Catalog }) {
  const { t } = useTranslation(['plan', 'domain'])
  const { heat, top } = sessionHeat(day.prescriptions, catalog.byId)
  const view = dominantView(top)
  const names = top.map((m) => t(`domain:muscles.${m}`)).join(', ')
  return (
    <Section title={t('day.muscles')}>
      <div className="surface p-3">
        <AnatomyView
          className="h-72"
          heat={heat}
          view={view}
          label={t('day.musclesLabel', { muscles: names })}
          fallback={
            <div className="mx-auto grid h-full max-w-64 grid-cols-2 gap-2">
              <BodyMap view="front" heat={heat} />
              <BodyMap view="back" heat={heat} />
            </div>
          }
        />
        <p className="mt-2 text-center text-sm text-muted-foreground">{names}</p>
      </div>
    </Section>
  )
}
