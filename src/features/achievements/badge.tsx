import {
  CalendarDays,
  Check,
  Compass,
  Feather,
  Flame,
  Lock,
  Moon,
  Rotate3d,
  Ruler,
  Sunrise,
  Target,
  Trophy,
  Weight,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import type { AchievementIcon, Tier } from './definitions'

const ICONS: Record<AchievementIcon, LucideIcon> = {
  flame: Flame,
  calendar: CalendarDays,
  trophy: Trophy,
  weight: Weight,
  sunrise: Sunrise,
  moon: Moon,
  compass: Compass,
  check: Check,
  feather: Feather,
  ruler: Ruler,
  rotate: Rotate3d,
  target: Target,
}

const TIER_COLOR: Record<Tier, string> = {
  bronze: 'var(--bronze)',
  silver: 'var(--silver)',
  gold: 'var(--gold)',
  damascus: 'var(--damascus)',
}

/** Medalla hexagonal con el color del rango; en gris si está bloqueada. */
export function AchievementBadge({
  icon,
  tier,
  unlocked,
  className,
}: {
  icon: AchievementIcon
  tier: Tier
  unlocked: boolean
  className?: string
}) {
  const Icon = unlocked ? ICONS[icon] : Lock
  const color = TIER_COLOR[tier]
  return (
    <div
      aria-hidden
      className={cn('relative grid size-16 shrink-0 place-items-center', className)}
      style={{ '--tier': color } as React.CSSProperties}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={`tier-${tier}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="1" />
            <stop offset="1" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
          {tier === 'damascus' && (
            <pattern id="damascus-waves" width="16" height="10" patternUnits="userSpaceOnUse">
              <path
                d="M0 5 Q4 0 8 5 T16 5"
                fill="none"
                stroke="white"
                strokeOpacity="0.28"
                strokeWidth="1.6"
              />
            </pattern>
          )}
        </defs>
        <polygon
          points="50,3 91,26 91,74 50,97 9,74 9,26"
          fill={unlocked ? `url(#tier-${tier})` : 'var(--muted)'}
          stroke={unlocked ? color : 'var(--border)'}
          strokeWidth="3"
        />
        {unlocked && tier === 'damascus' && (
          <polygon points="50,3 91,26 91,74 50,97 9,74 9,26" fill="url(#damascus-waves)" />
        )}
        <polygon
          points="50,14 81,32 81,68 50,86 19,68 19,32"
          fill="none"
          stroke={unlocked ? 'white' : 'var(--border)'}
          strokeOpacity={unlocked ? 0.35 : 1}
          strokeWidth="2"
        />
      </svg>
      <Icon
        className={cn(
          'relative size-[38%]',
          unlocked ? 'text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)]' : 'text-muted-foreground',
        )}
        strokeWidth={2.4}
      />
    </div>
  )
}
