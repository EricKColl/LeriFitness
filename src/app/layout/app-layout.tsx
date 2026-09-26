import { Suspense, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Navigate, Outlet } from 'react-router'

import { exerciseImage, loadCatalog, type Catalog } from '@/data/catalog'
import { syncInBackground } from '@/data/cloud/auto'
import { db } from '@/data/db'
import { createFirstPlan, ensureCurrentPlan, stripProfile } from '@/data/plans'
import type { PlanRow } from '@/data/db'
import { AchievementCelebration } from '@/features/achievements/celebration'
import { syncAchievements } from '@/features/achievements/sync'
import { MagicErickButton, MagicErickHost } from '@/features/assistant/launcher'
import { cacheImages } from '@/shared/lib/image-cache'

import { BottomNav } from './bottom-nav'
import { Splash } from './splash'

/**
 * Guarda para uso sin conexión las imágenes de los ejercicios del plan y de sus primeras
 * alternativas (en segundo plano; si falla, se reintenta la próxima vez).
 */
async function precachePlanImages(plan: PlanRow, catalog: Catalog) {
  const ids = new Set(
    plan.plan.days.flatMap((d) =>
      d.prescriptions.flatMap((p) => [p.exerciseId, ...p.alternatives.slice(0, 3)]),
    ),
  )
  const urls = [...ids].flatMap((id) => catalog.byId.get(id)?.images.map(exerciseImage) ?? [])
  await cacheImages(urls)
}

/** Pantallas con barra inferior y el botón de MagicErick (con hueco para no tapar el final). */
export function AppLayout() {
  return (
    <div className="min-h-dvh pb-[calc(max(env(safe-area-inset-bottom),0.75rem)+9.5rem)]">
      <Suspense fallback={<Splash />}>
        <Outlet />
      </Suspense>
      <MagicErickButton />
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
      let plan = await ensureCurrentPlan(catalog)
      if (!plan) {
        const row = await db.profile.get('me')
        if (row) plan = await createFirstPlan(stripProfile(row), catalog)
      }
      if (plan) void precachePlanImages(plan, catalog)
      await syncAchievements()
      syncInBackground()
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
      <MagicErickHost />
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
