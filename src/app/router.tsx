import { createBrowserRouter, Navigate } from 'react-router'

import { AppLayout, RequireNoProfile, RequireProfile } from './layout/app-layout'
import { ErrorPage, NotFoundPage } from './error-page'

export const router = createBrowserRouter([
  {
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <Navigate to="/hoy" replace /> },
      {
        element: <RequireNoProfile />,
        children: [
          {
            path: '/bienvenida',
            lazy: async () => ({
              Component: (await import('@/features/onboarding/OnboardingPage')).OnboardingPage,
            }),
          },
        ],
      },
      {
        element: <RequireProfile />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                path: '/hoy',
                lazy: async () => ({
                  Component: (await import('@/features/today/TodayPage')).TodayPage,
                }),
              },
              {
                path: '/plan',
                lazy: async () => ({
                  Component: (await import('@/features/plan/PlanPage')).PlanPage,
                }),
              },
              {
                path: '/plan/:dayId',
                lazy: async () => ({
                  Component: (await import('@/features/plan/DayPage')).DayPage,
                }),
              },
              {
                path: '/forja-plus',
                lazy: async () => ({
                  Component: (await import('@/features/premium/PremiumPage')).PremiumPage,
                }),
              },
              {
                path: '/asistente',
                lazy: async () => ({
                  Component: (await import('@/features/assistant/AssistantPage')).AssistantPage,
                }),
              },
              {
                path: '/ejercicios',
                lazy: async () => ({
                  Component: (await import('@/features/library/LibraryPage')).LibraryPage,
                }),
              },
              {
                path: '/ejercicios/:id',
                lazy: async () => ({
                  Component: (await import('@/features/library/ExercisePage')).ExercisePage,
                }),
              },
              {
                path: '/progreso',
                lazy: async () => ({
                  Component: (await import('@/features/progress/ProgressPage')).ProgressPage,
                }),
              },
              {
                path: '/progreso/sesion/:id',
                lazy: async () => ({
                  Component: (await import('@/features/progress/SessionDetailPage'))
                    .SessionDetailPage,
                }),
              },
              {
                path: '/logros',
                lazy: async () => ({
                  Component: (await import('@/features/achievements/AchievementsPage'))
                    .AchievementsPage,
                }),
              },
              {
                path: '/perfil',
                lazy: async () => ({
                  Component: (await import('@/features/profile/ProfilePage')).ProfilePage,
                }),
              },
              {
                path: '/perfil/editar',
                lazy: async () => ({
                  Component: (await import('@/features/profile/EditProfilePage')).EditProfilePage,
                }),
              },
            ],
          },
          {
            path: '/sesion/:dayId',
            lazy: async () => ({
              Component: (await import('@/features/session/SessionPage')).SessionPage,
            }),
          },
        ],
      },
      {
        // Fuera de la guarda de perfil: en un dispositivo nuevo se puede entrar y recuperar los
        // datos de la nube antes del onboarding.
        path: '/perfil/cuenta',
        lazy: async () => ({
          Component: (await import('@/features/profile/AccountPage')).AccountPage,
        }),
      },
      {
        path: '/legal/:doc',
        lazy: async () => ({
          Component: (await import('@/features/legal/LegalPage')).LegalPage,
        }),
      },
      {
        path: '/dev/diseno',
        lazy: async () => ({
          Component: (await import('@/features/design-system/DesignSystemPage')).DesignSystemPage,
        }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
