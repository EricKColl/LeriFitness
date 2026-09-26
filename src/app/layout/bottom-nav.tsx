import { CalendarDays, ChartNoAxesColumnIncreasing, Dumbbell, Flame, UserRound } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'

import { cn } from '@/shared/lib/utils'

const ITEMS = [
  { to: '/hoy', key: 'today', icon: Flame },
  { to: '/plan', key: 'plan', icon: CalendarDays },
  { to: '/ejercicios', key: 'library', icon: Dumbbell },
  { to: '/progreso', key: 'progress', icon: ChartNoAxesColumnIncreasing },
  { to: '/perfil', key: 'profile', icon: UserRound },
] as const

export function BottomNav() {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 pb-safe backdrop-blur-xl supports-[backdrop-filter]:bg-background/70"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-1.5">
        {ITEMS.map(({ to, key, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.7rem] font-semibold transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-x-2 inset-y-1 -z-10 rounded-2xl bg-primary/12"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  )}
                  <Icon className="size-[1.4rem]" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                  <span>{t(`nav.${key}`)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
