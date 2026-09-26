import { ChevronRight, CircleAlert, Lightbulb, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import {
  hasEquipment,
  INJURY_ZONES,
  isContraindicated,
  type Exercise,
  type Profile,
} from '@/domain'
import { exerciseName, useCatalog, type Catalog } from '@/data/catalog'
import { useProfile } from '@/data/hooks'
import { ExerciseMuscleMap } from '@/features/anatomy/body-map'
import { useDynamicT } from '@/i18n/reason'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { EmptyState, Page, Section } from '@/shared/ui/page'

import { ExerciseFrames, ExerciseThumb } from './exercise-image'

export function ExercisePage() {
  const { id } = useParams()
  const catalog = useCatalog()
  const profile = useProfile()
  const { t } = useTranslation('library')
  const exercise = id ? catalog.byId.get(id) : undefined
  if (profile === undefined) return null
  if (!exercise)
    return (
      <Page back>
        <EmptyState title={t('exercise.notFound')} />
      </Page>
    )
  return <ExerciseView key={exercise.id} exercise={exercise} catalog={catalog} profile={profile} />
}

/** Lista de errores: los propios del ejercicio o, si no tiene, los típicos de su patrón. */
function useMistakes(exercise: Exercise, catalog: Catalog) {
  const { t } = useTranslation('domain')
  const own = catalog.content[exercise.id]?.mistakes
  if (own?.length) return own
  const generic = t(`patternMistakes.${exercise.pattern}` as 'patternMistakes.squat', {
    returnObjects: true,
    defaultValue: [],
  })
  return Array.isArray(generic) ? generic : []
}

function ExerciseView({
  exercise: e,
  catalog,
  profile,
}: {
  exercise: Exercise
  catalog: Catalog
  profile: Profile | null
}) {
  const { t } = useTranslation(['library', 'domain', 'common'])
  const dt = useDynamicT()
  const content = catalog.content[e.id]
  const name = exerciseName(catalog, e.id)
  const mistakes = useMistakes(e, catalog)
  const list = new Intl.ListFormat('es', { type: 'conjunction' })

  const risky = (profile?.injuries ?? []).filter(
    (i) =>
      isContraindicated(e.jointStress[i.zone], i.severity) || e.jointStress[i.zone] === 'moderate',
  )
  const available = profile
    ? hasEquipment(e.equipment, new Set(['bodyweight', ...profile.equipment]))
    : true
  const alternatives = e.alternatives
    .map((id) => catalog.byId.get(id))
    .filter((a): a is Exercise => !!a)
    .slice(0, 6)
  const stress = INJURY_ZONES.filter((z) => e.jointStress[z])

  return (
    <Page back eyebrow={dt(`domain:patterns.${e.pattern}`)} title={name}>
      <ExerciseFrames exercise={e} alt={t('exercise.imageAlt', { name })} />
      <p className="mt-1.5 text-right text-[0.7rem] text-muted-foreground">
        {t('exercise.credit')}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="secondary">{t(`domain:levels.${e.level}`)}</Badge>
        {e.mechanic && <Badge variant="secondary">{t(`domain:mechanics.${e.mechanic}`)}</Badge>}
        <Badge variant="secondary">{t(`domain:categories.${e.category}`)}</Badge>
        {e.unilateral && <Badge variant="steel">{t('exercise.unilateral')}</Badge>}
      </div>

      {risky.length > 0 && (
        <p className="mt-4 flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <TriangleAlert className="size-5 shrink-0 text-warning" />
          {t('exercise.injuryWarning', {
            zones: list.format(risky.map((i) => t(`domain:injuryZones.${i.zone}`).toLowerCase())),
          })}
        </p>
      )}
      {!available && (
        <p className="mt-4 flex gap-3 rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
          <CircleAlert className="size-5 shrink-0" />
          {t('exercise.notAvailable')}
        </p>
      )}

      {content && (
        <Section title={t('exercise.steps')}>
          <ol className="flex flex-col gap-3">
            {content.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="bg-ember-gradient grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="pt-0.5 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {mistakes.length > 0 && (
        <Section title={t('exercise.mistakes')}>
          <ul className="surface flex flex-col gap-2.5 p-4">
            {mistakes.map((m) => (
              <li key={m} className="flex gap-2.5 text-sm">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                {m}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {content?.tips && content.tips.length > 0 && (
        <Section title={t('exercise.tips')}>
          <ul className="surface flex flex-col gap-2.5 p-4">
            {content.tips.map((tip) => (
              <li key={tip} className="flex gap-2.5 text-sm">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
                {tip}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={t('exercise.muscles')}>
        <div className="surface grid grid-cols-[1fr_1.1fr] items-center gap-4 p-4">
          <ExerciseMuscleMap primary={e.primaryMuscles} secondary={e.secondaryMuscles} />
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <span className="size-2.5 rounded-full bg-[var(--heat-4)]" />
                {t('exercise.primary')}
              </dt>
              <dd className="font-medium">
                {e.primaryMuscles.map((m) => t(`domain:muscles.${m}`)).join(', ')}
              </dd>
            </div>
            {e.secondaryMuscles.length > 0 && (
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <span className="size-2.5 rounded-full bg-[var(--heat-2)]" />
                  {t('exercise.secondary')}
                </dt>
                <dd>{e.secondaryMuscles.map((m) => t(`domain:muscles.${m}`)).join(', ')}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">
                {t('exercise.equipment')}
              </dt>
              <dd>{e.equipment.map((q) => t(`domain:equipment.${q}`)).join(', ')}</dd>
            </div>
          </dl>
        </div>
      </Section>

      {stress.length > 0 && (
        <Section title={t('exercise.stress')}>
          <p className="mb-2 text-xs text-muted-foreground">{t('exercise.stressHint')}</p>
          <ul className="flex flex-wrap gap-2">
            {stress.map((zone) => {
              const level = e.jointStress[zone]!
              return (
                <li
                  key={zone}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold',
                    level === 'high' && 'bg-destructive/15 text-destructive',
                    level === 'moderate' && 'bg-warning/15 text-warning',
                    level === 'low' && 'bg-success/15 text-success',
                  )}
                >
                  {t(`domain:injuryZones.${zone}`)} · {t(`domain:stress.${level}`).toLowerCase()}
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {alternatives.length > 0 && (
        <Section title={t('exercise.alternatives')}>
          <ul className="flex flex-col gap-1">
            {alternatives.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/ejercicios/${a.id}`}
                  replace
                  className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-accent/50"
                >
                  <ExerciseThumb exercise={a} />
                  <span className="flex-1 font-medium">{exerciseName(catalog, a.id)}</span>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Page>
  )
}
