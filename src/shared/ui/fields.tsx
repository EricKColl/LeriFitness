import { useId, type ReactNode } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/utils'

/** Tarjeta de opción grande (radio o casilla) para elecciones importantes. */
export function OptionCard({
  selected,
  onSelect,
  icon,
  title,
  description,
  role = 'radio',
  className,
}: {
  selected: boolean
  onSelect: () => void
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  role?: 'radio' | 'checkbox'
  className?: string
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'group relative flex w-full items-center gap-4 rounded-3xl border p-4 text-left transition-[border-color,background-color,transform] duration-200 ease-forge active:scale-[0.985]',
        selected
          ? 'border-primary/70 bg-primary/10'
          : 'border-border/70 bg-card hover:border-border hover:bg-accent/40',
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-2xl transition-colors [&_svg]:size-6',
            selected ? 'bg-ember-gradient text-primary-foreground' : 'bg-secondary text-foreground',
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        {description && (
          <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
        )}
      >
        {selected && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  )
}

/** Chip seleccionable. */
export function Chip({
  selected,
  onClick,
  children,
  className,
  disabled,
  ...rest
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  className?: string
  disabled?: boolean
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl border px-4 text-sm font-semibold whitespace-nowrap transition-[border-color,background-color,color,transform] duration-200 ease-forge active:scale-[0.96] disabled:opacity-40',
        selected
          ? 'border-primary/70 bg-primary text-primary-foreground'
          : 'border-border/80 bg-card text-foreground hover:bg-accent/50',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/** Control segmentado para pocas opciones excluyentes. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'default',
}: {
  value: T | undefined
  onChange: (value: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
  size?: 'default' | 'sm'
}) {
  const id = useId()
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative flex rounded-2xl bg-secondary p-1"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex-1 rounded-xl px-3 font-semibold transition-colors',
              size === 'sm' ? 'min-h-9 text-xs' : 'min-h-11 text-sm',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                className="absolute inset-0 rounded-xl bg-card shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Número con botones grandes de +/− y entrada directa. */
export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  label,
  big,
  format,
}: {
  value: number | null
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  label: string
  big?: boolean
  format?: (value: number) => string
}) {
  const { t } = useTranslation()
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  const current = value ?? min
  const display = value === null ? '' : format ? format(value) : String(value).replace('.', ',')
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`${t('a11y.decrease')} ${label}`}
        onClick={() => onChange(clamp(current - step))}
        disabled={value !== null && value <= min}
        className={cn(
          'grid shrink-0 place-items-center rounded-2xl bg-secondary text-foreground transition-transform active:scale-90 disabled:opacity-40',
          big ? 'size-16' : 'size-12',
        )}
      >
        <Minus className={big ? 'size-7' : 'size-5'} />
      </button>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative min-w-0 flex-1">
        <input
          id={id}
          inputMode="decimal"
          value={display}
          onChange={(e) => {
            const parsed = Number(e.target.value.replace(',', '.'))
            if (e.target.value === '') return
            if (!Number.isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)))
          }}
          onFocus={(e) => e.target.select()}
          className={cn(
            'w-full rounded-2xl border border-input bg-card text-center font-display font-extrabold tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40',
            big ? 'h-16 text-4xl' : 'h-12 text-2xl',
            unit && 'pr-10',
          )}
        />
        {unit && (
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      <button
        type="button"
        aria-label={`${t('a11y.increase')} ${label}`}
        onClick={() => onChange(clamp(current + step))}
        disabled={value !== null && value >= max}
        className={cn(
          'grid shrink-0 place-items-center rounded-2xl bg-secondary text-foreground transition-transform active:scale-90 disabled:opacity-40',
          big ? 'size-16' : 'size-12',
        )}
      >
        <Plus className={big ? 'size-7' : 'size-5'} />
      </button>
    </div>
  )
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <span className="text-sm font-semibold">{children}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}
