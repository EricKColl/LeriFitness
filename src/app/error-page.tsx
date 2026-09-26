import { Compass, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

import { Button } from '@/shared/ui/button'
import { LogoMark } from '@/shared/ui/logo'

export function ErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  return <ErrorView />
}

function ErrorView() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <LogoMark className="size-14 opacity-80" />
      <h1 className="text-2xl font-extrabold">{t('errors.title')}</h1>
      <p className="text-muted-foreground">{t('errors.body')}</p>
      <Button onClick={() => window.location.assign('/hoy')}>
        <RotateCcw /> {t('actions.reload')}
      </Button>
    </main>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Compass className="size-14 text-primary" aria-hidden />
      <h1 className="text-2xl font-extrabold">{t('errors.notFound')}</h1>
      <p className="text-muted-foreground">{t('errors.notFoundBody')}</p>
      <Button asChild>
        <Link to="/hoy">{t('errors.goHome')}</Link>
      </Button>
    </main>
  )
}
