import { useState } from 'react'
import { ChevronRight, LineChart as LineIcon, Pencil, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import type { Muscle, SessionLog } from '@/domain'
import { exerciseName, useCatalog } from '@/data/catalog'
import type { PlanRow } from '@/data/db'
import { useActivePlan, useMeasurements, useSessions } from '@/data/hooks'
import { BodyMap, HeatLegend, type HeatLevel, type View } from '@/features/anatomy/body-map'
import { countRecords } from '@/features/achievements/definitions'
import { useDynamicT } from '@/i18n/reason'
import { fromISODate, today, weekStartOf } from '@/shared/lib/dates'
import { formatKg } from '@/shared/lib/format'
import { BarChart, LineChart } from '@/shared/ui/charts'
import { Segmented } from '@/shared/ui/fields'
import { EmptyState, Page, Section } from '@/shared/ui/page'
import { Button } from '@/shared/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

import { MeasurementSheet } from './measurement-sheet'
import {
  e1rmSeries,
  heatLevel,
  isFinished,
  muscleSets,
  sessionMinutes,
  sessionTonnage,
  weeklySummary,
  workSets,
} from './stats'

const TABS = ['overview', 'strength', 'body', 'history'] as const
type Tab = (typeof TABS)[number]

export function ProgressPage() {
  const { t } = useTranslation('progress')
  const sessions = useSessions()
  const planRow = useActivePlan()
  const [params, setParams] = useSearchParams()
  const tab = (TABS as readonly string[]).includes(params.get('vista') ?? '')
    ? (params.get('vista') as Tab)
    : 'overview'
  if (!sessions || planRow === undefined) return null
  const finished = sessions.filter(isFinished)

  return (
    <Page title={t('title')}>
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ vista: v }, { replace: true, preventScrollReset: true })}
      >
        <TabsList className="w-full">
          {TABS.map((id) => (
            <TabsTrigger key={id} value={id} className="flex-1">
              {t(`tabs.${id}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview">
          {finished.length === 0 ? (
            <EmptyState
              icon={<LineIcon className="size-7 text-primary" />}
              title={t('empty.title')}
              body={t('empty.body')}
            />
          ) : (
            <Overview sessions={finished} planRow={planRow} />
          )}
        </TabsContent>
        <TabsContent value="strength">
          <Strength sessions={finished} />
        </TabsContent>
        <TabsContent value="body">
          <Body />
        </TabsContent>
        <TabsContent value="history">
          <History sessions={finished} />
        </TabsContent>
      </Tabs>
    </Page>
  )
}

function Overview({ sessions, planRow }: { sessions: SessionLog[]; planRow: PlanRow | null }) {
  const { t, i18n } = useTranslation(['progress', 'domain'])
  const catalog = useCatalog()
  const [view, setView] = useState<View>('front')
  const [selected, setSelected] = useState<Muscle | null>(null)
  const weekStart = weekStartOf(today())
  const weekSessions = sessions.filter((s) => weekStartOf(s.date) === weekStart)
  const sets = muscleSets(weekSessions, catalog.byId)
  const volume = planRow?.plan.volume
  const heat: Partial<Record<Muscle, HeatLevel>> = {}
  for (const m of Object.keys(sets) as Muscle[]) {
    const range = volume?.[m] ?? { min: 0, max: 10 }
    heat[m] = heatLevel(sets[m], range.max > 0 ? range : { min: 0, max: 6 })
  }
  const summary = weeklySummary(sessions, weekStart)
  const short = (week: string) =>
    fromISODate(week).toLocaleDateString(i18n.language, { day: 'numeric', month: 'numeric' })
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
  const totals = [
    { label: t('totals.sessions'), value: number.format(sessions.length) },
    {
      label: t('totals.hours'),
      value: number.format(sessions.reduce((s, x) => s + sessionMinutes(x), 0) / 60),
    },
    {
      label: t('totals.tonnage'),
      value: number.format(sessions.reduce((s, x) => s + sessionTonnage(x), 0) / 1000),
    },
    { label: t('totals.records'), value: number.format(countRecords(sessions)) },
  ]

  return (
    <>
      <dl className="mt-5 grid grid-cols-4 gap-2">
        {totals.map((x) => (
          <div key={x.label} className="surface flex flex-col items-center p-3 text-center">
            <dd className="font-display text-xl font-extrabold tabular-nums">{x.value}</dd>
            <dt className="text-[0.7rem] text-muted-foreground">{x.label}</dt>
          </div>
        ))}
      </dl>

      <Section title={t('map.title')}>
        <div className="surface p-4">
          <Segmented
            label={t('map.title')}
            value={view}
            onChange={setView}
            size="sm"
            options={[
              { value: 'front', label: t('map.front') },
              { value: 'back', label: t('map.back') },
            ]}
          />
          <div className="mx-auto mt-3 max-w-44">
            <BodyMap
              view={view}
              heat={heat}
              selected={selected}
              onSelect={(m) => setSelected(m === selected ? null : m)}
              label={t('map.label', { view: t(`map.${view}`) })}
            />
          </div>
          <p className="mt-3 min-h-10 text-center text-sm" aria-live="polite">
            {selected
              ? t('map.muscle', {
                  muscle: t(`domain:muscles.${selected}`),
                  done: number.format(sets[selected]),
                  min: volume?.[selected].min ?? 0,
                  max: volume?.[selected].max ?? 0,
                })
              : t('map.hint')}
          </p>
          <HeatLegend low={t('map.low')} high={t('map.high')} />
        </div>
      </Section>

      <Section title={t('weekly.title')}>
        <div className="surface flex flex-col gap-4 p-4">
          <div>
            <p className="mb-1 text-sm font-semibold">{t('weekly.sessions')}</p>
            <BarChart
              label={t('weekly.chartSessions')}
              data={summary.map((w) => ({ label: short(w.week), value: w.sessions }))}
              height={140}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">{t('weekly.volume')}</p>
            <BarChart
              label={t('weekly.chartVolume')}
              data={summary.map((w) => ({ label: short(w.week), value: w.tonnage }))}
              format={(v) => (v >= 1000 ? `${number.format(v / 1000)}k` : number.format(v))}
              height={140}
            />
          </div>
        </div>
      </Section>
    </>
  )
}

function Strength({ sessions }: { sessions: SessionLog[] }) {
  const { t, i18n } = useTranslation('progress')
  const catalog = useCatalog()
  // Ejercicios con carga registrada, los más frecuentes primero.
  const counts = new Map<string, number>()
  for (const s of sessions)
    for (const id of new Set(
      workSets(s)
        .filter((x) => x.kg)
        .map((x) => x.exerciseId),
    ))
      counts.set(id, (counts.get(id) ?? 0) + 1)
  const options = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  const [chosen, setChosen] = useState<string | null>(null)
  const id = chosen && options.includes(chosen) ? chosen : options[0]

  if (!id) return <EmptyState title={t('empty.title')} body={t('strength.empty')} />
  const series = e1rmSeries(sessions, id)
  const best = series.reduce((a, b) => (b.value > a.value ? b : a), series[0]!)
  const name = exerciseName(catalog, id)
  return (
    <>
      <div className="-mx-5 mt-5 scrollbar-none flex gap-2 overflow-x-auto px-5">
        {options.slice(0, 12).map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={o === id}
            onClick={() => setChosen(o)}
            className={`min-h-11 shrink-0 rounded-2xl border px-4 text-sm font-semibold whitespace-nowrap ${
              o === id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card'
            }`}
          >
            {exerciseName(catalog, o)}
          </button>
        ))}
      </div>
      <Section title={t('strength.title')}>
        <div className="surface p-4">
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">
            {t('strength.best', { kg: formatKg(best.kg, i18n.language), reps: best.reps })}
          </p>
          <LineChart
            className="mt-3"
            label={t('strength.chart', { exercise: name })}
            data={series.map((p) => ({
              label: fromISODate(p.date).toLocaleDateString(i18n.language, {
                day: 'numeric',
                month: 'numeric',
              }),
              value: p.value,
            }))}
            format={(v) => formatKg(Math.round(v), i18n.language)}
          />
          <p className="mt-3 text-xs text-muted-foreground">{t('strength.hint')}</p>
        </div>
      </Section>
    </>
  )
}

function Body() {
  const { t, i18n } = useTranslation('progress')
  const measurements = useMeasurements()
  const [editing, setEditing] = useState<string | null>(null)
  if (!measurements) return null
  const weights = measurements.filter((m) => m.weightKg !== undefined)
  const date = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    fromISODate(iso).toLocaleDateString(i18n.language, opts)
  return (
    <>
      <Button className="mt-5 w-full" onClick={() => setEditing('new')}>
        <Plus />
        {t('body.add')}
      </Button>
      {weights.length > 0 ? (
        <Section title={t('body.weight')}>
          <div className="surface p-4">
            <LineChart
              label={t('body.chart')}
              data={weights.map((m) => ({
                label: date(m.date, { day: 'numeric', month: 'numeric' }),
                value: m.weightKg!,
              }))}
              format={(v) => formatKg(Math.round(v * 10) / 10, i18n.language)}
            />
          </div>
        </Section>
      ) : (
        <p className="surface mt-5 p-4 text-sm text-muted-foreground">{t('body.empty')}</p>
      )}
      {measurements.length > 0 && (
        <Section title={t('body.history')}>
          <ul className="flex flex-col gap-2">
            {[...measurements].reverse().map((m) => {
              const values = (
                Object.entries(m).filter(
                  ([k, v]) => k !== 'id' && k !== 'date' && v !== undefined,
                ) as [string, number][]
              ).map(
                ([k, v]) =>
                  `${t(`body.fields.${k}` as 'body.fields.weightKg')}: ${formatKg(v, i18n.language)}`,
              )
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(m.id)}
                    className="surface flex w-full items-center gap-3 p-4 text-left"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">
                        {date(m.date, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-sm text-muted-foreground">{values.join(' · ')}</p>
                    </div>
                    <Pencil className="size-4 text-muted-foreground" />
                  </button>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
      <MeasurementSheet
        measurement={
          editing && editing !== 'new' ? measurements.find((m) => m.id === editing) : undefined
        }
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </>
  )
}

function History({ sessions }: { sessions: SessionLog[] }) {
  const { t, i18n } = useTranslation('progress')
  const dt = useDynamicT()
  if (sessions.length === 0)
    return <EmptyState title={t('empty.title')} body={t('history.empty')} />
  return (
    <ul className="mt-5 flex flex-col gap-2">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link
            to={`/progreso/sesion/${s.id}`}
            className="surface flex items-center gap-3 p-4 transition-colors hover:bg-accent/40"
          >
            <div className="flex-1">
              <p className="font-semibold capitalize">
                {fromISODate(s.date).toLocaleDateString(i18n.language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('history.session', {
                  day: dt(`engine:days.${s.dayId}`),
                  minutes: sessionMinutes(s),
                  sets: workSets(s).length,
                })}
              </p>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
