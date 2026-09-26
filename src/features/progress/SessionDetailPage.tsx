import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { exerciseName, useCatalog } from '@/data/catalog'
import { db } from '@/data/db'
import { ExerciseThumb } from '@/features/library/exercise-image'
import { useDynamicT } from '@/i18n/reason'
import { fromISODate } from '@/shared/lib/dates'
import { formatKg } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { EmptyState, Page, Section } from '@/shared/ui/page'

import { sessionMinutes, sessionTonnage, workSets } from './stats'

export function SessionDetailPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['progress', 'common'])
  const dt = useDynamicT()
  const navigate = useNavigate()
  const catalog = useCatalog()
  const session = useLiveQuery(
    async () => (id ? ((await db.sessions.get(id)) ?? null) : null),
    [id],
  )
  const [confirm, setConfirm] = useState(false)

  if (session === undefined) return null
  if (!session)
    return (
      <Page back="/progreso?vista=history">
        <EmptyState title={t('detail.notFound')} />
      </Page>
    )

  const sets = workSets(session)
  const groups = new Map<string, typeof sets>()
  for (const s of sets) groups.set(s.exerciseId, [...(groups.get(s.exerciseId) ?? []), s])
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const stats = [
    { label: t('detail.duration'), value: `${sessionMinutes(session)} min` },
    { label: t('detail.sets'), value: String(sets.length) },
    { label: t('detail.volume'), value: `${number.format(sessionTonnage(session))} kg` },
    { label: t('detail.rpe'), value: session.rpe !== null ? String(session.rpe) : '—' },
  ]

  const remove = async () => {
    await db.sessions.delete(session.id)
    toast(t('detail.deleted'))
    void navigate('/progreso?vista=history', { replace: true })
  }

  return (
    <Page
      back
      eyebrow={fromISODate(session.date).toLocaleDateString(i18n.language, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}
      title={dt(`engine:days.${session.dayId}`)}
    >
      <dl className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="surface flex flex-col items-center p-3 text-center">
            <dd className="font-display text-lg font-extrabold tabular-nums">{s.value}</dd>
            <dt className="text-[0.7rem] text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </dl>

      {[...groups.entries()].map(([exerciseId, list]) => (
        <Section key={exerciseId}>
          <Link to={`/ejercicios/${exerciseId}`} className="flex items-center gap-3">
            <ExerciseThumb exercise={catalog.byId.get(exerciseId)} className="size-12" />
            <h2 className="font-semibold">{exerciseName(catalog, exerciseId)}</h2>
          </Link>
          <ol className="mt-2 flex flex-col gap-1">
            {list.map((s, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl bg-card px-3.5 py-2 text-sm tabular-nums"
              >
                <span className="w-6 text-muted-foreground">{i + 1}</span>
                <span className="flex-1 font-semibold">
                  {s.kg !== null ? `${formatKg(s.kg, i18n.language)} kg × ${s.reps}` : s.reps}
                </span>
                {s.rir !== null && (
                  <span className="text-xs text-muted-foreground">RIR {s.rir}</span>
                )}
              </li>
            ))}
          </ol>
        </Section>
      ))}

      {session.notes && (
        <Section title={t('detail.notes')}>
          <p className="surface p-4 text-sm whitespace-pre-wrap">{session.notes}</p>
        </Section>
      )}

      <Button
        variant="ghost"
        className="mt-8 w-full text-destructive"
        onClick={() => setConfirm(true)}
      >
        <Trash2 />
        {t('detail.delete')}
      </Button>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.deleteTitle')}</DialogTitle>
            <DialogDescription>{t('detail.deleteBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="destructive" onClick={() => void remove()}>
              {t('common:actions.delete')}
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('common:actions.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
