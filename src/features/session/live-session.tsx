import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Repeat2,
  SkipForward,
  Undo2,
  X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import {
  EFFORT_RIR,
  EFFORTS,
  type Effort,
  type Exercise,
  type LoggedSet,
  type SessionLog,
} from '@/domain'
import { workingSets, type PlanDay } from '@/engine'
import { exerciseName, useCatalog } from '@/data/catalog'
import { syncInBackground } from '@/data/cloud/auto'
import { db } from '@/data/db'
import { useSessions } from '@/data/hooks'
import { syncAchievements } from '@/features/achievements/sync'
import { MagicErickIconButton } from '@/features/assistant/launcher'
import { ExerciseThumb } from '@/features/library/exercise-image'
import { isFinished } from '@/features/progress/stats'
import { useReasonText } from '@/i18n/reason'
import { useNow } from '@/shared/hooks/use-now'
import { useWakeLock } from '@/shared/hooks/use-wake-lock'
import { formatClock, formatKg } from '@/shared/lib/format'
import { beep, unlockAudio, vibrate } from '@/shared/lib/sound'
import { cn } from '@/shared/lib/utils'
import { usePrefs } from '@/shared/stores/prefs'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { NumberStepper } from '@/shared/ui/fields'

import {
  addSet,
  adjustRest,
  endRest,
  finishSession,
  goTo,
  isItemDone,
  logSet,
  nextPending,
  progress,
  proposal,
  removeSet,
  setsFor,
  skipItem,
  substitute,
  undoLastSet,
  type ActiveSession,
} from './model'
import { RestTimer } from './rest-timer'
import { SwapSheet, TechniqueSheet } from './sheets'

async function save(active: ActiveSession) {
  await db.activeSession.put({ id: 'current', ...active })
}

export function LiveSession({
  active,
  day,
  onFinished,
}: {
  active: ActiveSession
  day: PlanDay
  onFinished: (session: SessionLog) => void
}) {
  const { t } = useTranslation(['session', 'common'])
  const navigate = useNavigate()
  const catalog = useCatalog()
  const history = useSessions()
  const { keepAwake } = usePrefs()
  useWakeLock(keepAwake)
  const now = useNow(true, 500)
  const [exitOpen, setExitOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [techniqueOpen, setTechniqueOpen] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)

  const { state } = active
  const index = state.current
  const item = state.items[index]
  const exercise = item ? catalog.byId.get(item.exerciseId) : undefined
  const done = setsFor(active, index)
  const { done: setsDone, total: setsTotal } = progress(active)
  const allDone = nextPending(active, index) === null

  const apply = (next: ActiveSession) => void save(next)

  const finish = async () => {
    const session = finishSession(active, Date.now())
    if (!isFinished(session)) {
      // Sin series registradas no hay nada que guardar.
      await db.activeSession.delete('current')
      void navigate('/hoy', { replace: true })
      return
    }
    await db.transaction('rw', db.sessions, db.activeSession, async () => {
      await db.sessions.put(session)
      await db.activeSession.delete('current')
    })
    await syncAchievements()
    syncInBackground()
    onFinished(session)
  }

  const discard = async () => {
    await db.activeSession.delete('current')
    void navigate('/hoy', { replace: true })
  }

  if (!item || !exercise) return null

  const lastTime = lastSets(history ?? [], item.exerciseId, active.session.id)

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col pt-safe">
      <header className="sticky top-0 z-20 bg-background px-3 pt-2 pb-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('exit')}
            onClick={() => setExitOpen(true)}
          >
            <X className="size-6" />
          </Button>
          <div className="flex-1 text-center">
            <p
              className="font-display text-xl font-extrabold tabular-nums"
              aria-label={t('elapsed')}
            >
              {formatClock((now - active.session.startedAt) / 1000)}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {t('progress', { done: setsDone, total: setsTotal })}
            </p>
          </div>
          <MagicErickIconButton exerciseId={item.exerciseId} />
          <Button
            variant={allDone ? 'default' : 'secondary'}
            size="sm"
            onClick={() => (allDone ? void finish() : setFinishOpen(true))}
          >
            {t('finish')}
          </Button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <motion.div
            className="bg-ember-gradient h-full rounded-full"
            animate={{ width: `${setsTotal ? (setsDone / setsTotal) * 100 : 0}%` }}
          />
        </div>
        <ExercisePills active={active} onSelect={(i) => apply(goTo(active, i))} />
      </header>

      <main id="main" className="flex flex-1 flex-col px-5 pb-safe">
        {index === 0 && done.length === 0 && setsDone === 0 && (
          <p className="mt-2 rounded-2xl bg-secondary p-3 text-sm text-muted-foreground">
            {t('warmupHint', { minutes: day.warmup.generalMinutes })}
          </p>
        )}

        <ExerciseHeader
          active={active}
          exercise={exercise}
          onTechnique={() => setTechniqueOpen(true)}
          onPrev={() => apply(goTo(active, index - 1))}
          onNext={() => apply(goTo(active, index + 1))}
        />

        <SetList active={active} lastTime={lastTime} />

        <div className="mt-auto pt-4 pb-4">
          {allDone ? (
            <div className="surface-glow rounded-3xl border border-success/30 p-5 text-center">
              <p className="text-xl font-extrabold">{t('allDone')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('allDoneBody')}</p>
              <Button size="xl" className="mt-4 w-full" onClick={() => void finish()}>
                <Check strokeWidth={3} />
                {t('finish')}
              </Button>
            </div>
          ) : isItemDone(active, index) ? (
            <div className="rounded-3xl bg-secondary p-5 text-center">
              <p className="font-semibold">{t('exerciseDone')}</p>
              <Button
                className="mt-3"
                onClick={() => apply(goTo(active, nextPending(active, index) ?? index))}
              >
                {t('rest.next', {
                  exercise: exerciseName(
                    catalog,
                    state.items[nextPending(active, index) ?? index]?.exerciseId ?? '',
                  ),
                })}
              </Button>
            </div>
          ) : (
            <SetEditor
              key={`${index}-${done.length}-${item.exerciseId}`}
              active={active}
              exercise={exercise}
              lastTime={lastTime}
              onLog={(set) => {
                unlockAudio()
                apply(logSet(active, set))
              }}
            />
          )}

          <div className="mt-3 grid grid-cols-4 gap-1">
            <ToolButton
              icon={<Plus />}
              label={t('addSet')}
              onClick={() => apply(addSet(active, index))}
            />
            <ToolButton
              icon={<Minus />}
              label={t('removeSet')}
              disabled={item.sets <= Math.max(1, done.length)}
              onClick={() => apply(removeSet(active, index))}
            />
            <ToolButton
              icon={<Repeat2 />}
              label={t('swap')}
              disabled={done.length > 0}
              onClick={() => setSwapOpen(true)}
            />
            <ToolButton
              icon={<SkipForward />}
              label={t('skip')}
              disabled={isItemDone(active, index)}
              onClick={() => apply(skipItem(active, index))}
            />
          </div>
          {active.session.sets.length > 0 && (
            <button
              type="button"
              onClick={() => {
                apply(undoLastSet(active))
                toast(t('undone'))
              }}
              className="mx-auto mt-2 flex min-h-11 items-center gap-2 px-3 text-sm font-medium text-muted-foreground"
            >
              <Undo2 className="size-4" />
              {t('undo')}
            </button>
          )}
        </div>
      </main>

      <RestPanel active={active} now={now} onChange={apply} />

      <TechniqueSheet exercise={exercise} open={techniqueOpen} onOpenChange={setTechniqueOpen} />
      <SwapSheet
        item={item}
        open={swapOpen}
        onOpenChange={setSwapOpen}
        onSwap={(id) => {
          apply(substitute(active, index, id))
          setSwapOpen(false)
        }}
      />

      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exitTitle')}</DialogTitle>
            <DialogDescription>{t('exitBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={() => navigate('/hoy')}>{t('keep')}</Button>
            <Button variant="destructive" onClick={() => void discard()}>
              {t('discard')}
            </Button>
            <Button variant="ghost" onClick={() => setExitOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finishTitle')}</DialogTitle>
            <DialogDescription>
              {t('finishBody', { count: Math.max(0, setsTotal - setsDone) })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={() => setFinishOpen(false)}>{t('keepGoing')}</Button>
            <Button variant="secondary" onClick={() => void finish()}>
              {t('finishAnyway')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Series de la última sesión (terminada) en la que se hizo el ejercicio. */
function lastSets(history: readonly SessionLog[], exerciseId: string, currentId: string) {
  for (const s of history) {
    if (s.id === currentId || !isFinished(s)) continue
    const sets = workingSets(s.sets, exerciseId)
    if (sets.length) return sets
  }
  return []
}

function ExercisePills({
  active,
  onSelect,
}: {
  active: ActiveSession
  onSelect: (index: number) => void
}) {
  const catalog = useCatalog()
  const ref = useRef<HTMLOListElement>(null)
  const current = active.state.current
  useEffect(() => {
    // Solo desplazamiento horizontal: scrollIntoView movería también la página.
    const list = ref.current
    const pill = list?.querySelector<HTMLElement>('[aria-current="step"]')
    if (list && pill)
      list.scrollTo({
        left: pill.offsetLeft - list.clientWidth / 2 + pill.clientWidth / 2,
        behavior: 'smooth',
      })
  }, [current])
  return (
    <ol ref={ref} className="-mx-3 mt-2 scrollbar-none flex gap-1.5 overflow-x-auto px-3">
      {active.state.items.map((item, i) => {
        const doneItem = isItemDone(active, i)
        const isCurrent = i === current
        return (
          <li key={item.slotId}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={exerciseName(catalog, item.exerciseId)}
              className={cn(
                'grid size-9 place-items-center rounded-full text-sm font-bold transition-colors',
                isCurrent && 'bg-primary text-primary-foreground',
                !isCurrent && doneItem && 'bg-success/20 text-success',
                !isCurrent && !doneItem && 'bg-secondary text-muted-foreground',
                item.skipped && !isCurrent && 'line-through opacity-60',
              )}
            >
              {doneItem && !isCurrent && !item.skipped ? (
                <Check className="size-4" strokeWidth={3} />
              ) : (
                i + 1
              )}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function ExerciseHeader({
  active,
  exercise,
  onTechnique,
  onPrev,
  onNext,
}: {
  active: ActiveSession
  exercise: Exercise
  onTechnique: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const { t } = useTranslation(['session', 'common'])
  const catalog = useCatalog()
  const reasonText = useReasonText((id) => exerciseName(catalog, id))
  const index = active.state.current
  const item = active.state.items[index]!
  const total = active.state.items.length
  return (
    <section className="mt-3">
      <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-primary uppercase">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          aria-label={t('common:actions.back')}
          className="grid size-9 place-items-center rounded-full disabled:opacity-30"
        >
          <ChevronLeft className="size-5" />
        </button>
        {t('exerciseOf', { index: index + 1, total })}
        <button
          type="button"
          onClick={onNext}
          disabled={index === total - 1}
          aria-label={t('common:actions.continue')}
          className="grid size-9 place-items-center rounded-full disabled:opacity-30"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3.5">
        <button
          type="button"
          onClick={onTechnique}
          aria-label={t('technique')}
          className="relative shrink-0"
        >
          <ExerciseThumb exercise={exercise} className="size-20 rounded-2xl" />
          <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full bg-foreground text-background">
            <BookOpen className="size-3.5" />
          </span>
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-extrabold text-balance">
            {exerciseName(catalog, exercise.id)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(item.unit === 'seconds' ? 'targetSeconds' : 'target', {
              sets: item.sets,
              min: item.reps.min,
              max: item.reps.max,
            })}{' '}
            ·{' '}
            {item.rir.min === item.rir.max
              ? t('rirOne', { min: item.rir.min })
              : t('rir', { min: item.rir.min, max: item.rir.max })}
          </p>
        </div>
      </div>
      <p className="mt-3 rounded-2xl bg-steel-soft/60 px-3.5 py-2.5 text-sm">
        {reasonText(item.loadNote)}
      </p>
    </section>
  )
}

function SetList({ active, lastTime }: { active: ActiveSession; lastTime: LoggedSet[] }) {
  const { t, i18n } = useTranslation('session')
  const index = active.state.current
  const item = active.state.items[index]!
  const done = setsFor(active, index)
  const unit = item.unit === 'seconds' ? ' s' : ''
  const fmt = (s: Pick<LoggedSet, 'kg' | 'reps'>) =>
    s.kg !== null ? `${formatKg(s.kg, i18n.language)} kg × ${s.reps}${unit}` : `${s.reps}${unit}`
  return (
    <section className="mt-4">
      {lastTime.length > 0 && (
        <p className="mb-2 text-xs text-muted-foreground">
          {t('lastTime', { sets: lastTime.map(fmt).join(' · ') })}
        </p>
      )}
      <ol className="grid grid-cols-2 gap-1.5">
        {Array.from({ length: Math.max(item.sets, done.length) }, (_, i) => {
          const set = done[i]
          const isCurrent = !set && i === done.length && !item.skipped
          return (
            <li
              key={i}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm',
                set && 'bg-card',
                isCurrent && 'bg-primary/10 ring-1 ring-primary/50',
                !set && !isCurrent && 'border border-dashed border-border text-muted-foreground',
              )}
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[0.7rem] font-bold">
                {set ? <Check className="size-3 text-success" strokeWidth={3} /> : i + 1}
              </span>
              <span className="truncate font-semibold tabular-nums">
                {set ? fmt(set) : t('set', { index: i + 1 })}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function SetEditor({
  active,
  exercise,
  lastTime,
  onLog,
}: {
  active: ActiveSession
  exercise: Exercise
  lastTime: LoggedSet[]
  onLog: (set: LoggedSet) => void
}) {
  const { t } = useTranslation('session')
  const item = active.state.items[active.state.current]!
  const initial = proposal(active, exercise, lastTime)
  const [kg, setKg] = useState(initial.kg)
  const [reps, setReps] = useState(initial.reps)
  const [effort, setEffort] = useState<Effort>('solid')
  const seconds = item.unit === 'seconds'
  const done = setsFor(active, active.state.current).length
  return (
    <div className="surface flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold">{t('setOf', { index: done + 1, total: item.sets })}</p>
      {kg !== null && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t('kg')}</p>
          <NumberStepper
            value={kg}
            onChange={setKg}
            min={0}
            max={500}
            step={initial.step || 1}
            unit="kg"
            label={t('kg')}
            big
          />
        </div>
      )}
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {seconds ? t('seconds') : t('reps')}
          {kg === null && !seconds && ` · ${t('bodyweight')}`}
        </p>
        <NumberStepper
          value={reps}
          onChange={setReps}
          min={0}
          max={seconds ? 600 : 100}
          step={seconds ? 5 : 1}
          unit={seconds ? 's' : undefined}
          label={seconds ? t('seconds') : t('reps')}
          big
        />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('effort')}</p>
        <div role="radiogroup" aria-label={t('effort')} className="grid grid-cols-3 gap-1.5">
          {EFFORTS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={effort === e}
              onClick={() => setEffort(e)}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center rounded-2xl border px-1 transition-colors',
                effort === e
                  ? 'border-primary bg-primary/15 text-foreground'
                  : 'border-border bg-card text-muted-foreground',
              )}
            >
              <span className="text-sm font-semibold">{t(`efforts.${e}`)}</span>
              <span className="text-[0.7rem] leading-tight">{t(`efforts.${e}Hint`)}</span>
            </button>
          ))}
        </div>
      </div>
      <Button
        size="xl"
        className="w-full"
        disabled={reps <= 0}
        onClick={() =>
          onLog({ exerciseId: item.exerciseId, kg, reps, rir: EFFORT_RIR[effort], at: Date.now() })
        }
      >
        <Check strokeWidth={3} />
        {t('logSet')}
      </Button>
    </div>
  )
}

function ToolButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[0.7rem] leading-tight font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-35 [&_svg]:size-5"
    >
      {icon}
      {label}
    </button>
  )
}

/** Panel de descanso: aparece sobre la parte inferior mientras corre el temporizador. */
function RestPanel({
  active,
  now,
  onChange,
}: {
  active: ActiveSession
  now: number
  onChange: (next: ActiveSession) => void
}) {
  const { t } = useTranslation('session')
  const catalog = useCatalog()
  const reduced = useReducedMotion()
  const { sound, vibration } = usePrefs()
  const { restEndsAt, restTotal } = active.state
  const remaining = restEndsAt === null ? 0 : Math.max(0, (restEndsAt - now) / 1000)
  const finished = restEndsAt !== null && remaining <= 0
  const alerted = useRef<number | null>(null)
  const latest = useRef({ active, onChange })
  useEffect(() => {
    latest.current = { active, onChange }
  })

  useEffect(() => {
    if (!finished || alerted.current === restEndsAt) return
    alerted.current = restEndsAt
    if (sound) beep()
    if (vibration) vibrate([200, 100, 200])
  }, [finished, restEndsAt, sound, vibration])

  // Al acabar, el aviso se queda un momento y el panel se cierra solo.
  useEffect(() => {
    if (!finished) return
    const timer = setTimeout(() => {
      const { active: current, onChange: change } = latest.current
      if (current.state.restEndsAt === restEndsAt) change(endRest(current))
    }, 1500)
    return () => clearTimeout(timer)
  }, [finished, restEndsAt])

  const item = active.state.items[active.state.current]
  return (
    <AnimatePresence>
      {restEndsAt !== null && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { y: '100%' }}
          animate={reduced ? { opacity: 1 } : { y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          role="timer"
          aria-live="off"
          className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg rounded-t-3xl border-t border-border bg-card px-5 pt-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.5)]"
        >
          <div className="flex items-center gap-5">
            <RestTimer remaining={remaining} total={restTotal} done={finished} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-steel">
                {finished ? t('rest.done') : t('rest.title')}
              </p>
              {item && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('rest.next', { exercise: exerciseName(catalog, item.exerciseId) })}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  variant="steel"
                  size="sm"
                  onClick={() => onChange(adjustRest(active, -15, Date.now()))}
                >
                  {t('rest.less')}
                </Button>
                <Button
                  variant="steel"
                  size="sm"
                  onClick={() => onChange(adjustRest(active, 15, Date.now()))}
                >
                  {t('rest.more')}
                </Button>
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => onChange(endRest(active))}
          >
            {t('rest.skip')}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
