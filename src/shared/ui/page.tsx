import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

interface PageProps {
  title?: ReactNode
  eyebrow?: ReactNode
  subtitle?: ReactNode
  /** Muestra un botón para volver (a la ruta indicada o atrás en el historial). */
  back?: string | true
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** Sin padding lateral (para contenido a sangre). */
  bleed?: boolean
}

/** Contenedor de pantalla: cabecera, entrada animada y márgenes seguros. */
export function Page({
  title,
  eyebrow,
  subtitle,
  back,
  actions,
  children,
  className,
  bleed,
}: PageProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  return (
    <motion.main
      id="main"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn('mx-auto w-full max-w-lg pt-safe', !bleed && 'px-5', className)}
    >
      {(title || back || actions) && (
        <header className={cn('flex items-start gap-3 pt-5 pb-4', bleed && 'px-5')}>
          {back && (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-3 shrink-0"
              aria-label={t('actions.back')}
              onClick={() => (back === true ? navigate(-1) : navigate(back))}
            >
              <ChevronLeft className="size-6" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                {eyebrow}
              </p>
            )}
            {title && (
              <h1 className="text-[1.75rem] leading-tight font-extrabold text-balance">{title}</h1>
            )}
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </header>
      )}
      {children}
    </motion.main>
  )
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mt-7', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode
  title: ReactNode
  body?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="surface grain flex flex-col items-center gap-3 px-6 py-10 text-center">
      {icon && (
        <div className="grid size-14 place-items-center rounded-2xl bg-secondary">{icon}</div>
      )}
      <p className="font-display text-lg font-bold">{title}</p>
      {body && <p className="max-w-xs text-sm text-muted-foreground">{body}</p>}
      {action}
    </div>
  )
}
