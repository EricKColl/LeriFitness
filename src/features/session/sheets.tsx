import { ArrowUpRight, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { Exercise } from '@/domain'
import { exerciseName, useCatalog } from '@/data/catalog'
import { ExerciseFrames, ExerciseThumb } from '@/features/library/exercise-image'
import { cn } from '@/shared/lib/utils'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'

import type { SessionItem } from './model'

export function TechniqueSheet({
  exercise,
  open,
  onOpenChange,
}: {
  exercise: Exercise
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation(['session', 'library'])
  const catalog = useCatalog()
  const name = exerciseName(catalog, exercise.id)
  const content = catalog.content[exercise.id]
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="px-5 pt-6 pb-6">
        <SheetHeader className="p-0 pr-10 text-left">
          <SheetTitle className="font-display text-2xl font-extrabold">{name}</SheetTitle>
          <SheetDescription className="sr-only">{t('library:exercise.steps')}</SheetDescription>
        </SheetHeader>
        <ExerciseFrames exercise={exercise} alt={t('library:exercise.imageAlt', { name })} />
        {content && (
          <ol className="flex flex-col gap-3">
            {content.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="bg-ember-gradient grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        )}
        <Link
          to={`/ejercicios/${exercise.id}`}
          className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
        >
          {t('library:exercise.mistakes')} · {t('library:exercise.tips')}
          <ArrowUpRight className="size-4" />
        </Link>
      </SheetContent>
    </Sheet>
  )
}

export function SwapSheet({
  item,
  open,
  onOpenChange,
  onSwap,
}: {
  item: SessionItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwap: (exerciseId: string) => void
}) {
  const { t } = useTranslation('session')
  const catalog = useCatalog()
  const options = [
    ...(item.exerciseId !== item.plannedExerciseId ? [item.plannedExerciseId] : []),
    ...item.alternatives.filter((id) => id !== item.exerciseId && id !== item.plannedExerciseId),
  ]
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="px-5 pt-6 pb-6">
        <SheetHeader className="p-0 pr-10 text-left">
          <SheetTitle className="font-display text-2xl font-extrabold">{t('swapTitle')}</SheetTitle>
          <SheetDescription>{t('swapBody')}</SheetDescription>
        </SheetHeader>
        <ul className="flex flex-col gap-1">
          {options.map((id) => {
            const planned = id === item.plannedExerciseId
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSwap(id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-accent/50',
                    planned && 'bg-primary/10',
                  )}
                >
                  <ExerciseThumb exercise={catalog.byId.get(id)} />
                  <span className="flex-1">
                    <span className="block font-medium">{exerciseName(catalog, id)}</span>
                    {planned && (
                      <span className="text-xs font-semibold text-primary">{t('restore')}</span>
                    )}
                  </span>
                  {id === item.exerciseId && <Check className="size-5 text-primary" />}
                </button>
              </li>
            )
          })}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
