import { Check, ChevronRight, Clock, Settings2, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { MUSCLES, type Profile, type SessionLog } from '@/domain'
import type { Plan, Reason } from '@/engine'
import { exerciseName, useCatalog } from '@/data/catalog'
import type { PlanRow } from '@/data/db'
import { useActivePlan, useProfile, useWeekSessions } from '@/data/hooks'
import { MagicErickAvatar } from '@/features/assistant/launcher'
import { openMagicErick } from '@/features/assistant/store'
import { useDynamicT, useReasonText } from '@/i18n/reason'
import { fromISODate, today, weekStartOf } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/utils'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui/accordion'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Page, Section } from '@/shared/ui/page'

import { completedDayIds, plannedDates } from './schedule'

export function PlanPage() {
  const profile = useProfile()
  const planRow = useActivePlan()
  const weekStart = weekStartOf(today())
  const sessions = useWeekSessions(weekStart)
  if (!profile || !planRow || !sessions) return null
  return <PlanView profile={profile} planRow={planRow} sessions={sessions} weekStart={weekStart} />
}

function PlanView({
  profile,
  planRow,
  sessions,
  weekStart,
}: {
  profile: Profile
  planRow: PlanRow
  sessions: SessionLog[]
  weekStart: string
}) {
  const { t, i18n } = useTranslation(['plan', 'engine'])
  const dt = useDynamicT()
  const catalog = useCatalog()
  const reasonText = useReasonText((id) => exerciseName(catalog, id))
  const { plan } = planRow
  const dates = plannedDates(plan, profile.weekdays, weekStart)
  const done = completedDayIds(sessions)
  const { mesocycle } = plan

  return (
    <Page
      eyebrow={t('mesocycle', {
        index: mesocycle.index,
        week: mesocycle.week,
        length: mesocycle.length,
      })}
      title={dt(`engine:splitNames.${plan.split}`)}
      actions={
        <Button asChild variant="ghost" size="icon" aria-label={t('edit')}>
          <Link to="/perfil/editar">
            <Settings2 className="size-5" />
          </Link>
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={plan.weekKind === 'deload' ? 'steel' : 'ember'}>
          {t(`engine:weekKind.${plan.weekKind}`)}
        </Badge>
        <MesocycleBar week={mesocycle.week} length={mesocycle.length} deload={mesocycle.deload} />
      </div>

      <Section title={t('days')}>
        <ol className="flex flex-col gap-2.5">
          {plan.days.map((day) => {
            const date = dates.get(day.id)
            const isDone = done.has(day.id)
            return (
              <li key={day.id}>
                <Link
                  to={`/plan/${day.id}`}
                  className="surface flex items-center gap-4 p-4 transition-colors hover:bg-accent/40"
                >
                  <span
                    className={cn(
                      'grid size-12 shrink-0 place-items-center rounded-2xl text-center text-xs leading-tight font-bold uppercase',
                      isDone ? 'bg-ember-gradient text-primary-foreground' : 'bg-secondary',
                    )}
                  >
                    {isDone ? (
                      <Check className="size-5" strokeWidth={3} />
                    ) : date ? (
                      fromISODate(date).toLocaleDateString(i18n.language, { weekday: 'short' })
                    ) : (
                      '—'
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{dt(`engine:days.${day.template}`)}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {dt(`engine:dayFocus.${day.template}`)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />~{day.estimatedMinutes} min ·{' '}
                      {isDone ? t('done') : date ? null : t('unscheduled')}
                      {!isDone &&
                        date &&
                        fromISODate(date).toLocaleDateString(i18n.language, {
                          weekday: 'long',
                          day: 'numeric',
                        })}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            )
          })}
        </ol>
      </Section>

      {plan.warnings.length > 0 && (
        <Section title={t('warnings')}>
          <ul className="flex flex-col gap-2">
            {plan.warnings.map((w) => (
              <li
                key={w.key + JSON.stringify(w.params)}
                className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm"
              >
                <TriangleAlert className="size-5 shrink-0 text-warning" />
                {reasonText(w)}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={t('why.title')}>
        <p className="mb-2 text-sm text-muted-foreground">{t('why.subtitle')}</p>
        <Accordion type="multiple" defaultValue={planRow.adaptation.length ? ['adaptation'] : []}>
          {planRow.adaptation.length > 0 && (
            <ReasonList id="adaptation" title={t('why.adaptation')} reasons={planRow.adaptation} />
          )}
          <ReasonList id="decisions" title={t('why.decisions')} reasons={plan.reasons} />
          <AccordionItem value="volume">
            <AccordionTrigger>{t('volume.title')}</AccordionTrigger>
            <AccordionContent>
              <VolumeBars plan={plan} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="energy">
            <AccordionTrigger>{t('energy.title')}</AccordionTrigger>
            <AccordionContent>
              <EnergyInfo plan={plan} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      <button
        type="button"
        onClick={() => openMagicErick()}
        className="surface-glow mt-7 flex w-full items-center gap-4 rounded-3xl border border-border/70 p-4 text-left transition-colors hover:bg-accent/40"
      >
        <MagicErickAvatar className="size-12" />
        <span className="flex-1">
          <span className="block font-semibold">{t('assistant.title')}</span>
          <span className="block text-sm text-muted-foreground">{t('assistant.body')}</span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" />
      </button>

      <Section title={t('cardio.title')}>
        <p className="surface p-4 text-sm text-muted-foreground">
          {t('cardio.body', { minutes: plan.weeklyCardioMinutes })}
        </p>
      </Section>

      <Button asChild variant="outline" size="lg" className="mt-7 w-full">
        <Link to="/perfil/editar">{t('edit')}</Link>
      </Button>
    </Page>
  )
}

function MesocycleBar({ week, length, deload }: { week: number; length: number; deload: boolean }) {
  return (
    <div className="flex flex-1 items-center gap-1" aria-hidden>
      {Array.from({ length }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 flex-1 rounded-full',
            i + 1 < week && 'bg-primary/50',
            i + 1 === week && (deload ? 'bg-steel' : 'bg-primary'),
            i + 1 > week && (i === length - 1 ? 'bg-steel/25' : 'bg-muted'),
          )}
        />
      ))}
    </div>
  )
}

function ReasonList({ id, title, reasons }: { id: string; title: string; reasons: Reason[] }) {
  const catalog = useCatalog()
  const reasonText = useReasonText((exercise) => exerciseName(catalog, exercise))
  return (
    <AccordionItem value={id}>
      <AccordionTrigger>{title}</AccordionTrigger>
      <AccordionContent>
        <ul className="flex flex-col gap-2.5">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              {reasonText(r)}
            </li>
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  )
}

function VolumeBars({ plan }: { plan: Plan }) {
  const { t } = useTranslation(['plan', 'domain'])
  const muscles = MUSCLES.filter((m) => plan.volume[m].max > 0)
  const scale = Math.max(
    ...muscles.map((m) => Math.max(plan.volume[m].max, plan.volume[m].planned)),
  )
  const fmt = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')
  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">{t('volume.hint')}</p>
      <ul className="flex flex-col gap-2">
        {muscles.map((m) => {
          const v = plan.volume[m]
          return (
            <li
              key={m}
              className="grid grid-cols-[7.5rem_1fr_2.25rem] items-center gap-2 text-sm"
              aria-label={`${t(`domain:muscles.${m}`)}: ${t('volume.planned', {
                value: fmt(v.planned),
                min: v.min,
                max: v.max,
              })}`}
            >
              <span className="truncate">{t(`domain:muscles.${m}`)}</span>
              <span className="relative h-2.5 rounded-full bg-muted" aria-hidden>
                <span
                  className="absolute inset-y-0 rounded-full bg-steel/25"
                  style={{
                    left: `${(v.min / scale) * 100}%`,
                    width: `${((v.max - v.min) / scale) * 100}%`,
                  }}
                />
                <span
                  className="bg-ember-gradient absolute inset-y-0.5 left-0 rounded-full"
                  style={{ width: `${Math.min(100, (v.planned / scale) * 100)}%` }}
                />
              </span>
              <span className="text-right font-semibold tabular-nums" aria-hidden>
                {fmt(v.planned)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function EnergyInfo({ plan }: { plan: Plan }) {
  const { t, i18n } = useTranslation('plan')
  const number = new Intl.NumberFormat(i18n.language)
  return (
    <div>
      <dl className="grid grid-cols-2 gap-2">
        {(['bmr', 'tdee'] as const).map((k) => (
          <div key={k} className="rounded-2xl bg-secondary p-3">
            <dt className="text-xs text-muted-foreground">{t(`energy.${k}`)}</dt>
            <dd className="font-display text-lg font-extrabold tabular-nums">
              {t('energy.value', { value: number.format(Math.round(plan.energy[k])) })}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">{t('energy.note')}</p>
    </div>
  )
}
