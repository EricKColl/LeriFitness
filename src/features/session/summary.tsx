import { useState } from 'react'
import { Clock, Dumbbell, Trophy, Weight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import type { SessionLog } from '@/domain'
import { exerciseName, useCatalog } from '@/data/catalog'
import { db } from '@/data/db'
import { useSessions } from '@/data/hooks'
import { sessionMinutes, sessionRecords, sessionTonnage, workSets } from '@/features/progress/stats'
import { formatKg } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { Slider } from '@/shared/ui/slider'
import { Textarea } from '@/shared/ui/textarea'

export function SessionSummary({ session }: { session: SessionLog }) {
  const { t, i18n } = useTranslation(['session', 'common'])
  const navigate = useNavigate()
  const catalog = useCatalog()
  const history = useSessions() ?? []
  const reduced = useReducedMotion()
  const [rpe, setRpe] = useState(7)
  const [notes, setNotes] = useState('')
  const records = sessionRecords(session, history)
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const labels = t('summary.rpeLabels', { returnObjects: true })

  const stats = [
    { icon: Clock, label: t('summary.duration'), value: `${sessionMinutes(session)} min` },
    { icon: Dumbbell, label: t('summary.sets'), value: String(workSets(session).length) },
    {
      icon: Weight,
      label: t('summary.volume'),
      value: `${number.format(sessionTonnage(session))} kg`,
    },
  ]

  const save = async () => {
    await db.sessions.update(session.id, { rpe, notes: notes.trim() || undefined })
    toast.success(t('summary.saved'))
    void navigate('/hoy', { replace: true })
  }

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-safe pb-safe">
      <motion.div
        initial={reduced ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="bg-ember-gradient mx-auto mt-10 grid size-20 place-items-center rounded-3xl text-primary-foreground shadow-[0_0_50px_-10px_var(--ember)]"
      >
        <Trophy className="size-10" />
      </motion.div>
      <h1 className="mt-5 text-center text-3xl font-extrabold">{t('summary.title')}</h1>

      <dl className="mt-6 grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="surface flex flex-col items-center gap-1 p-3 text-center">
            <s.icon className="size-5 text-primary" />
            <dd className="font-display text-xl font-extrabold tabular-nums">{s.value}</dd>
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </dl>

      {records.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">{t('summary.records')}</h2>
          <ul className="flex flex-col gap-2">
            {records.map((r) => (
              <li
                key={r.exerciseId}
                className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-[color-mix(in_oklch,var(--gold)_12%,transparent)] p-3 text-sm"
              >
                <Trophy className="size-5 shrink-0 text-gold" />
                {t('summary.record', {
                  exercise: exerciseName(catalog, r.exerciseId),
                  value: formatKg(Math.round(r.e1rm * 10) / 10, i18n.language),
                  previous: formatKg(Math.round(r.previous * 10) / 10, i18n.language),
                })}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-bold">{t('summary.rpe')}</h2>
        <p className="text-xs text-muted-foreground">{t('summary.rpeHint')}</p>
        <p className="mt-3 font-display text-3xl font-extrabold tabular-nums">
          {rpe} <span className="text-base font-semibold text-muted-foreground">{labels[rpe]}</span>
        </p>
        <Slider
          className="mt-2"
          value={[rpe]}
          min={1}
          max={10}
          step={1}
          onValueChange={([v]) => v !== undefined && setRpe(v)}
          aria-label={t('summary.rpe')}
        />
      </section>

      <section className="mt-6">
        <label htmlFor="notes" className="text-lg font-bold">
          {t('notes')}
        </label>
        <Textarea
          id="notes"
          className="mt-2"
          value={notes}
          maxLength={2000}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('notesPlaceholder')}
        />
      </section>

      <Button size="xl" className="my-8 w-full" onClick={() => void save()}>
        {t('summary.save')}
      </Button>
    </main>
  )
}
