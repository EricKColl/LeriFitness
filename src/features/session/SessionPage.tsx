import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import type { SessionLog } from '@/domain'
import { useCatalog } from '@/data/catalog'
import { db } from '@/data/db'
import { useActivePlan, useActiveSession } from '@/data/hooks'
import { Splash } from '@/app/layout/splash'
import { useDynamicT } from '@/i18n/reason'
import { today } from '@/shared/lib/dates'
import { Button } from '@/shared/ui/button'
import { EmptyState, Page } from '@/shared/ui/page'

import { LiveSession } from './live-session'
import { startSession, type ActiveSession } from './model'
import { SessionSummary } from './summary'

/** Sesión a pantalla completa (sin barra inferior). */
export function SessionPage() {
  return (
    <Suspense fallback={<Splash />}>
      <SessionLoader />
    </Suspense>
  )
}

function SessionLoader() {
  const { dayId } = useParams()
  const { t } = useTranslation('session')
  const dt = useDynamicT()
  useCatalog()
  const planRow = useActivePlan()
  const row = useActiveSession()
  const [finished, setFinished] = useState<SessionLog | null>(null)
  const day = planRow?.plan.days.find((d) => d.id === dayId)

  // Sin sesión en curso: se crea al entrar (y se guarda para poder retomarla).
  const shouldStart = !finished && row === null && !!planRow && !!day
  useEffect(() => {
    if (!shouldStart || !planRow || !day) return
    const active = startSession(day, planRow.id, today(), Date.now())
    void db.activeSession.add({ id: 'current', ...active }).catch(() => {
      // Otra pestaña (o el doble montaje de desarrollo) ya la ha creado.
    })
  }, [shouldStart, planRow, day])

  if (finished) return <SessionSummary session={finished} />
  if (planRow === undefined || row === undefined) return <Splash />
  if (!day || !planRow)
    return (
      <Page back="/hoy">
        <EmptyState title={t('notFound')} />
      </Page>
    )
  if (!row) return <Splash />
  if (row.session.dayId !== day.id) {
    const other = planRow.plan.days.find((d) => d.id === row.session.dayId)
    return (
      <Page back="/hoy">
        <EmptyState
          title={t('resumeOther', {
            day: other ? dt(`engine:days.${other.template}`) : row.session.dayId,
          })}
          action={
            <Button asChild>
              <Link to={`/sesion/${row.session.dayId}`}>{t('goToActive')}</Link>
            </Button>
          }
        />
      </Page>
    )
  }
  return <LiveSession active={row as ActiveSession} day={day} onFinished={setFinished} />
}
