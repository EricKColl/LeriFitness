export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export type Level = (typeof LEVELS)[number]

export const LEVEL_RANK: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 }
