import catalogJson from '@/data/generated/exercises.json'
import {
  DEFAULT_WEEKDAYS,
  EQUIPMENT_PRESETS,
  ExerciseCatalogSchema,
  type LoggedSet,
  type Profile,
  type SessionLog,
  type Weekday,
} from '@/domain'

/** Catálogo real generado: los tests del motor validan contra los datos de producción. */
export const CATALOG = ExerciseCatalogSchema.parse(catalogJson).exercises

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    sex: 'female',
    age: 34,
    heightCm: 168,
    weightKg: 64,
    job: 'sedentary',
    weekdays: DEFAULT_WEEKDAYS[3] as Weekday[],
    minutesPerSession: 60,
    equipment: [...EQUIPMENT_PRESETS.fullGym],
    level: 'intermediate',
    injuries: [],
    goal: 'hypertrophy',
    ...overrides,
  }
}

let counter = 0

export function makeSession(
  exerciseId: string,
  sets: { kg: number | null; reps: number; rir?: number | null }[],
  startedAt: number,
  extra: Partial<SessionLog> = {},
): SessionLog {
  counter++
  return {
    id: `s${counter}`,
    dayId: 'upperA',
    planId: 'p1',
    date: new Date(startedAt).toISOString().slice(0, 10),
    startedAt,
    endedAt: startedAt + 3600_000,
    sets: sets.map((s, i): LoggedSet => ({
      exerciseId,
      kg: s.kg,
      reps: s.reps,
      rir: s.rir ?? null,
      at: startedAt + i * 180_000,
    })),
    rpe: null,
    ...extra,
  }
}
