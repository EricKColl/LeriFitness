/**
 * Puntos de entrada de MagicErick, ligeros (van en el paquete principal): el botón flotante, el
 * contenedor de la ventana (que se descarga al abrirla por primera vez) y la ruta /asistente.
 */
import { lazy, Suspense, useEffect, useState } from 'react'
import { WandSparkles } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router'

import { cn } from '@/shared/lib/utils'

import { openMagicErick, useAssistant } from './store'

const MagicErickPanel = lazy(async () => ({
  default: (await import('./MagicErickPanel')).MagicErickPanel,
}))

export function MagicErickAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'bg-ember-gradient grid shrink-0 place-items-center rounded-full text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.35)]',
        className,
      )}
    >
      <WandSparkles className="size-[52%]" strokeWidth={2.2} />
    </span>
  )
}

/** Botón flotante, siempre visible encima de la barra inferior. */
export function MagicErickButton() {
  const { t } = useTranslation('assistant')
  const open = useAssistant((s) => s.open)
  const reduced = useReducedMotion()
  return (
    <AnimatePresence>
      {!open && (
        <motion.button
          type="button"
          aria-label={t('open')}
          title={t('open')}
          onClick={() => openMagicErick()}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
          whileTap={reduced ? undefined : { scale: 0.92 }}
          className="fixed right-4 bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+5.25rem)] z-40 rounded-full shadow-[0_12px_32px_-10px_var(--ember)] outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:right-6"
        >
          <MagicErickAvatar className="size-14" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/** Botón compacto para cabeceras (p. ej. en la sesión en curso, que no tiene barra inferior). */
export function MagicErickIconButton({ exerciseId = null }: { exerciseId?: string | null }) {
  const { t } = useTranslation('assistant')
  return (
    <button
      type="button"
      aria-label={t('open')}
      title={t('open')}
      onClick={() => openMagicErick(exerciseId)}
      className="grid size-11 shrink-0 place-items-center rounded-full outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <MagicErickAvatar className="size-9" />
    </button>
  )
}

/** Ventana de MagicErick: se descarga la primera vez que se abre y conserva la conversación. */
export function MagicErickHost() {
  const open = useAssistant((s) => s.open)
  const [used, setUsed] = useState(open)
  if (open && !used) setUsed(true)
  if (!used) return null
  return (
    <Suspense fallback={null}>
      <MagicErickPanel />
    </Suspense>
  )
}

/** /asistente (enlaces antiguos): abre la ventana, con el ejercicio indicado si lo hay. */
export function AssistantRoute() {
  const [params] = useSearchParams()
  const exerciseId = params.get('ejercicio')
  useEffect(() => openMagicErick(exerciseId), [exerciseId])
  return <Navigate to="/hoy" replace />
}
