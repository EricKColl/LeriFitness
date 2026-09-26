import { formatClock } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

/** Anillo de cuenta atrás en color acero (el color del descanso en la marca). */
export function RestTimer({
  remaining,
  total,
  done,
}: {
  remaining: number
  total: number
  done: boolean
}) {
  const r = 44
  const circumference = 2 * Math.PI * r
  const fraction = total > 0 ? Math.min(1, remaining / total) : 0
  return (
    <div className="relative grid size-28 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--steel-soft)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--steel)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-500 ease-linear"
        />
      </svg>
      <span
        className={cn(
          'font-display text-3xl font-extrabold tabular-nums',
          done ? 'text-steel' : 'text-foreground',
        )}
      >
        {formatClock(Math.ceil(remaining))}
      </span>
    </div>
  )
}
