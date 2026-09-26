import { useState } from 'react'
import {
  CalendarCheck,
  Check,
  ChevronRight,
  Clock,
  Feather,
  Flame,
  Gauge,
  Play,
  RotateCcw,
  Trophy,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { Profile, SessionLog } from '@/domain'
import type { PlanDay } from '@/engine'
import { exerciseName, useCatalog, type Catalog } from '@/data/catalog'
import type { PlanRow } from '@/data/db'
import {
  useAchievements,
  useActivePlan,
  useActiveSession,
  useCheckIn,
  usePlanExists,
  useProfile,
  useSessions,
} from '@/data/hooks'
import { ACHIEVEMENTS } from '@/features/achievements/definitions'
import { ExerciseThumb } from '@/features/library/exercise-image'
import { motivationContext, pickDaily, timeOfDay } from '@/features/motivation/messages'
import {
  nextPlanDay,
  nextSessionWhen,
  weekSchedule,
  type ScheduleDay,
} from '@/features/plan/schedule'
import {
  isFinished,
  sessionMinutes,
  sessionRecords,
  sessionTonnage,
  streakWeeks,
} from '@/features/progress/stats'
import { useDynamicT, useReasonText } from '@/i18n/reason'
import { addDays, daysBetween, fromISODate, today, weekStartOf } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/utils'
import { usePrefs } from '@/shared/stores/prefs'
import { Button } from '@/shared/ui/button'
import { Page, Section } from '@/shared/ui/page'

import { CheckInSheet } from './check-in'
import { InstallCard } from './install-card'

export function TodayPage() {
  const profile = useProfile()
  const planRow = useActivePlan()
  const sessions = useSessions()
  const active = useActiveSession()
  if (!profile || !planRow || !sessions || active === undefined) return null
  return (
    <Today
      profile={profile}
      planRow={planRow}
      sessions={sessions}
      active={active?.session ?? null}
    />
  )
}

function Today({
  profile,
  planRow,
  sessions,
  active,
}: {
  profile: Profile
  planRow: PlanRow
  sessions: SessionLog[]
  active: SessionLog | null
}) {
  const { t, i18n } = useTranslation(['today', 'motivation', 'engine', 'common'])
  const catalog = useCatalog()
  // La fecha y la hora se fijan al montar: la pantalla se vuelve a montar al volver a ella.
  const [now] = useState(() => Date.now())
  const todayIso = today()
  const weekStart = weekStartOf(todayIso)
  const lastWeek = addDays(weekStart, -7)
  const plan = planRow.plan

  const weekSessions = sessions.filter((s) => s.date >= weekStart && s.date < addDays(weekStart, 7))
  const finished = sessions.filter(isFinished)
  const schedule = weekSchedule(plan, profile.weekdays, weekStart, weekSessions, todayIso)
  const next = nextPlanDay(plan, weekSessions)
  const when = next
    ? nextSessionWhen(next, plan, profile.weekdays, weekStart, weekSessions, todayIso)
    : null
  const streak = streakWeeks(sessions, profile.weekdays.length, weekStart)
  const doneThisWeek = new Set(weekSessions.filter(isFinished).map((s) => s.dayId)).size

  const last = finished[0]
  const context = motivationContext({
    calibration: plan.mesocycle.calibration,
    deload: plan.weekKind === 'deload',
    streakWeeks: streak,
    daysSinceLastSession: last ? daysBetween(last.date, todayIso) : null,
    lastSessionHadPR: last ? sessionRecords(last, finished).length > 0 : false,
    weekDone: !next,
    trainingToday: when?.kind === 'today',
  })
  const messages = t(`motivation:messages.${context}`, {
    returnObjects: true,
    weeks: streak,
  })
  const message = pickDaily(messages, todayIso, context)

  const reduced = useReducedMotion()
  const item = (i: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.05 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
        }

  const dateLabel = new Date(now).toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <Page
      eyebrow={dateLabel}
      title={t(`motivation:greeting.${timeOfDay(new Date(now).getHours())}`)}
      subtitle={message}
      actions={<StreakPill streak={streak} />}
    >
      <div className="flex flex-col gap-3">
        <motion.div {...item(0)}>
          <WeekBanner planRow={planRow} />
        </motion.div>
        <motion.div {...item(1)}>
          <CheckInPrompt lastWeek={lastWeek} />
        </motion.div>
        <motion.div {...item(2)}>
          {active ? (
            <SessionCard
              catalog={catalog}
              day={plan.days.find((d) => d.id === active.dayId) ?? null}
              label={t('next.resume')}
              resume
            />
          ) : next && when ? (
            <SessionCard
              catalog={catalog}
              day={next}
              label={
                when.kind === 'today'
                  ? t('next.today')
                  : when.kind === 'rest'
                    ? t('next.rest')
                    : t('next.later', {
                        day: fromISODate(when.date).toLocaleDateString(i18n.language, {
                          weekday: 'long',
                        }),
                      })
              }
              early={when.kind !== 'today'}
            />
          ) : (
            <WeekDoneCard cardioMinutes={plan.weeklyCardioMinutes} />
          )}
        </motion.div>
      </div>

      <motion.div {...item(3)}>
        <Section
          title={t('week.title')}
          action={
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">
              {t('weekProgress', { done: doneThisWeek, total: plan.days.length })}
            </span>
          }
        >
          <WeekStrip schedule={schedule} />
        </Section>
      </motion.div>

      <motion.div {...item(4)}>
        <WeekStats sessions={weekSessions.filter(isFinished)} />
      </motion.div>

      <motion.div {...item(5)}>
        <AchievementsLink />
      </motion.div>

      <InstallCard now={now} />
    </Page>
  )
}

function StreakPill({ streak }: { streak: number }) {
  const { t } = useTranslation('today')
  return (
    <Link
      to="/logros"
      aria-label={streak > 0 ? t('streak', { count: streak }) : t('noStreak')}
      className={cn(
        'flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold tabular-nums',
        streak > 0 ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground',
      )}
    >
      <Flame className={cn('size-4.5', streak > 0 && 'fill-current')} />
      {streak}
    </Link>
  )
}

function WeekBanner({ planRow }: { planRow: PlanRow }) {
  const { t } = useTranslation(['today', 'engine'])
  const reasonText = useReasonText()
  const { plan } = planRow
  const kind = plan.mesocycle.calibration
    ? 'calibration'
    : plan.weekKind === 'deload'
      ? 'deload'
      : null
  const adaptation = planRow.adaptation[0]
  if (!kind && !adaptation) return null
  const Icon = kind === 'deload' ? Feather : kind === 'calibration' ? Gauge : RotateCcw
  return (
    <Link
      to="/plan"
      className="flex items-start gap-3 rounded-3xl border border-steel/25 bg-steel-soft/60 p-4 transition-colors hover:bg-steel-soft"
    >
      <Icon className="mt-0.5 size-5 shrink-0 text-steel" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{kind ? t(`banners.${kind}.title`) : t('banners.adapted')}</p>
        <p className="text-sm text-muted-foreground">
          {kind ? t(`banners.${kind}.body`) : adaptation && reasonText(adaptation)}
        </p>
      </div>
      <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
    </Link>
  )
}

function CheckInPrompt({ lastWeek }: { lastWeek: string }) {
  const { t } = useTranslation('today')
  const hadPlan = usePlanExists(lastWeek)
  const checkIn = useCheckIn(lastWeek)
  const { checkInDismissed, set } = usePrefs()
  const [open, setOpen] = useState(false)
  if (!hadPlan || checkIn !== null || checkInDismissed === lastWeek) return null
  return (
    <>
      <div className="surface-glow flex flex-col gap-3 rounded-3xl border border-primary/30 p-4">
        <div className="flex items-start gap-3">
          <CalendarCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">{t('banners.checkIn.title')}</p>
            <p className="text-sm text-muted-foreground">{t('banners.checkIn.body')}</p>
          </div>
        </div>
        <div className="flex gap-2 pl-8">
          <Button size="sm" onClick={() => setOpen(true)}>
            {t('banners.checkIn.action')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => set({ checkInDismissed: lastWeek })}>
            {t('banners.checkIn.dismiss')}
          </Button>
        </div>
      </div>
      <CheckInSheet weekStart={lastWeek} open={open} onOpenChange={setOpen} />
    </>
  )
}

function SessionCard({
  catalog,
  day,
  label,
  resume,
  early,
}: {
  catalog: Catalog
  day: PlanDay | null
  label: string
  resume?: boolean
  early?: boolean
}) {
  const { t } = useTranslation(['today', 'engine', 'common'])
  const dt = useDynamicT()
  if (!day) return null
  const shown = day.prescriptions.slice(0, 4)
  const more = day.prescriptions.length - shown.length
  const sets = day.prescriptions.reduce((sum, p) => sum + p.sets, 0)
  return (
    <article className="surface-glow grain relative overflow-hidden rounded-3xl border border-border/70 p-5">
      <p className="text-xs font-semibold tracking-wider text-primary uppercase">{label}</p>
      <h2 className="mt-1 text-3xl leading-tight font-extrabold">
        {dt(`engine:days.${day.template}`)}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{dt(`engine:dayFocus.${day.template}`)}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="size-4" />
          {t('next.minutes', { count: day.estimatedMinutes })}
        </span>
        <span>{t('common:units.exercises', { count: day.prescriptions.length })}</span>
        <span>{t('common:units.sets', { count: sets })}</span>
      </div>
      <ul
        className="mt-4 flex items-center gap-2"
        aria-label={t('common:units.exercises', { count: day.prescriptions.length })}
      >
        {shown.map((p) => (
          <li key={p.slotId} title={exerciseName(catalog, p.exerciseId)}>
            <ExerciseThumb exercise={catalog.byId.get(p.exerciseId)} className="size-14" />
            <span className="sr-only">{exerciseName(catalog, p.exerciseId)}</span>
          </li>
        ))}
        {more > 0 && (
          <li className="grid size-14 place-items-center rounded-xl bg-secondary text-sm font-bold text-muted-foreground">
            {t('next.moreExercises', { count: more })}
          </li>
        )}
      </ul>
      <div className="mt-5 flex gap-2">
        <Button asChild size="lg" variant={early ? 'secondary' : 'default'} className="flex-1">
          <Link to={`/sesion/${day.id}`}>
            <Play className="fill-current" />
            {resume ? t('next.resume_action') : early ? t('next.startEarly') : t('next.start')}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="px-5">
          <Link to={`/plan/${day.id}`}>{t('next.detail')}</Link>
        </Button>
      </div>
    </article>
  )
}

function WeekDoneCard({ cardioMinutes }: { cardioMinutes: number }) {
  const { t } = useTranslation('today')
  return (
    <article className="surface-glow grain rounded-3xl border border-success/30 p-5">
      <span className="grid size-12 place-items-center rounded-2xl bg-success/15 text-success">
        <Trophy className="size-6" />
      </span>
      <h2 className="mt-3 text-2xl font-extrabold">{t('weekDone.title')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('weekDone.body')}</p>
      {cardioMinutes > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t('weekDone.cardio', { minutes: cardioMinutes })}
        </p>
      )}
    </article>
  )
}

function WeekStrip({ schedule }: { schedule: ScheduleDay[] }) {
  const { t } = useTranslation(['today', 'common', 'engine'])
  const dt = useDynamicT()
  const short = t('common:weekdays.short', { returnObjects: true })
  const long = t('common:weekdays.long', { returnObjects: true })
  return (
    <ol className="grid grid-cols-7 gap-1.5">
      {schedule.map((day) => {
        const done = day.done.length > 0
        const missed = !done && day.planned && day.isPast
        const status = done
          ? t('week.done')
          : day.planned
            ? missed
              ? t('week.missed')
              : `${t('week.planned')}: ${dt(`engine:days.${day.planned.template}`)}`
            : t('week.rest')
        return (
          <li
            key={day.date}
            aria-label={t('week.day', {
              weekday: long[day.weekday],
              date: fromISODate(day.date).getDate(),
              status,
            })}
            aria-current={day.isToday ? 'date' : undefined}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-2xl py-2.5',
              day.isToday ? 'bg-card ring-2 ring-primary' : 'bg-card/60',
            )}
          >
            <span
              className={cn(
                'text-xs font-semibold',
                day.isToday ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {short[day.weekday]}
            </span>
            <span
              aria-hidden
              className={cn(
                'grid size-8 place-items-center rounded-full text-sm font-bold tabular-nums',
                done && 'bg-ember-gradient text-primary-foreground',
                !done && day.planned && !missed && 'border-2 border-primary/60',
                missed && 'border-2 border-dashed border-muted-foreground/40 text-muted-foreground',
                !done && !day.planned && 'text-muted-foreground',
              )}
            >
              {done ? (
                <Check className="size-4" strokeWidth={3} />
              ) : (
                fromISODate(day.date).getDate()
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function WeekStats({ sessions }: { sessions: SessionLog[] }) {
  const { t, i18n } = useTranslation('today')
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const minutes = sessions.reduce((sum, s) => sum + sessionMinutes(s), 0)
  const volume = sessions.reduce((sum, s) => sum + sessionTonnage(s), 0)
  const stats = [
    { label: t('stats.sessions'), value: number.format(sessions.length) },
    { label: t('stats.minutes'), value: number.format(minutes) },
    { label: t('stats.volume'), value: t('stats.volumeValue', { value: number.format(volume) }) },
  ]
  return (
    <Section title={t('stats.title')}>
      <dl className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="surface flex flex-col gap-0.5 p-3.5">
            <dt className="text-xs font-medium text-muted-foreground">{s.label}</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

function AchievementsLink() {
  const { t } = useTranslation('today')
  const unlocked = useAchievements()?.length ?? 0
  return (
    <Link
      to="/logros"
      className="surface mt-3 flex items-center gap-4 p-4 transition-colors hover:bg-accent/40"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-[color-mix(in_oklch,var(--gold)_22%,transparent)] text-gold">
        <Trophy className="size-6" />
      </span>
      <div className="flex-1">
        <p className="font-semibold">{t('achievements.title')}</p>
        <p className="text-sm text-muted-foreground">
          {t('achievements.body', { count: unlocked, total: ACHIEVEMENTS.length })}
        </p>
      </div>
      <ChevronRight className="size-5 text-muted-foreground" />
    </Link>
  )
}
