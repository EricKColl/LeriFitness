import { lazy, Suspense, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { usePrefs } from '@/shared/stores/prefs'
import { cn } from '@/shared/lib/utils'
import { ErrorBoundary } from '@/shared/ui/error-boundary'

import type { Body3DProps } from './body-3d'
import { supportsWebGL, useAnatomy3D } from './support'

const Body3D = lazy(() => import('./body-3d'))

/**
 * Anatomía en 3D cuando el dispositivo lo permite (y la persona no lo ha desactivado); si no, o si
 * falla, el mapa 2D que se pasa como `fallback`. Incluye un interruptor 3D/2D.
 */
export function AnatomyView({
  fallback,
  className,
  ...props
}: Body3DProps & { fallback: ReactNode }) {
  const { t } = useTranslation('common')
  const use3d = useAnatomy3D()
  const setPrefs = usePrefs((s) => s.set)
  const toggle = supportsWebGL() && (
    <button
      type="button"
      onClick={() => setPrefs({ anatomy3d: !use3d })}
      aria-pressed={use3d}
      aria-label={t('anatomy.toggle')}
      className="absolute top-2 right-2 z-10 min-h-9 rounded-full border border-border bg-card/90 px-3 text-xs font-bold backdrop-blur"
    >
      {use3d ? '2D' : '3D'}
    </button>
  )
  return (
    <div className={cn('relative', className)}>
      {toggle}
      {use3d ? (
        <ErrorBoundary fallback={fallback}>
          <Suspense
            fallback={
              <div className="grid size-full place-items-center" aria-hidden>
                <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            }
          >
            <Body3D {...props} className="size-full" />
          </Suspense>
          <Link
            to="/legal/licencias"
            className="absolute top-2 left-3 text-[0.65rem] text-muted-foreground underline-offset-2 hover:underline"
          >
            {t('anatomy.credit')}
          </Link>
        </ErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  )
}
