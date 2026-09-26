import { BicepsFlexed, Dumbbell, Flame, HeartPulse, Wind, type LucideIcon } from 'lucide-react'

import type { Goal } from '@/domain'

export const GOAL_ICONS: Record<Goal, LucideIcon> = {
  strength: Dumbbell,
  hypertrophy: BicepsFlexed,
  fatLoss: Flame,
  health: HeartPulse,
  endurance: Wind,
}
