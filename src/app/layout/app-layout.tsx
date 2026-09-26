import { Suspense, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Navigate, Outlet } from 'react-router'

import { loadCatalog } from '@/data/catalog'
import { db } from '@/data/db'
import { createFirstPlan, ensureCurrentPlan, stripProfile } from '@/data/plans'
import { AchievementCelebration } from '@/features/achievements/celebration'

import { BottomNav } from './bottom-nav'
import { Splash } from './splash'

/** Pantallas con barra inferior. */
export function AppLayout() {
  return (
    <div className="min-h-dvh pb-[calc(max(env(safe-area-inset-bottom),0.75rem)+5.5rem)]">
      <Suspense fallback={<Splash />}>
        <Outlet />
      </Suspense>
      <BottomNav />
    </div>
  )
}

/**
 * Puerta de la app: sin perfil, al onboarding; con perfil, asegura que el plan de la semana actual
 * existe (avanzando el mesociclo si ha cambiado la semana) antes de mostrar nada.
 */
export function RequireProfile() {
  const profile = useLiveQuery(() => db.profile.get('me').then((p) => p ?? null), [])
  const [ready, setReady] = useState(false)
  const hasProfile = !!profile

  useEffect(() => {
    if (!hasProfile) return
    let cancelled = false
    const sync = async () => {
      const catalog = await loadCatalog()
      const plan = await ensureCurrentPlan(catalog)
      if (!plan) {
        const row = await db.profile.get('me')
        if (row) await createFirstPlan(stripProfile(row), catalog)
      }
      if (!cancelled) setReady(true)
    }
    void sync()
    // Si la app se queda abierta y cambia la semana, se avanza al volver a ella.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [hasProfile])

  if (profile === undefined || (profile && !ready)) return <Splash />
  if (!profile) return <Navigate to="/bienvenida" replace />
  return (
    <>
      <Outlet />
      <AchievementCelebration />
    </>
  )
}

/** Al revés: si ya hay perfil, el onboarding no tiene sentido. */
export function RequireNoProfile() {
  const profile = useLiveQuery(() => db.profile.get('me').then((p) => p ?? null), [])
  if (profile === undefined) return <Splash />
  if (profile) return <Navigate to="/hoy" replace />
  return <Outlet />
}
