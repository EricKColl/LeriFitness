/**
 * Base de datos local (IndexedDB con Dexie). Es la fuente de verdad de la app: todo funciona sin
 * conexión y los datos de salud nunca salen del dispositivo.
 *
 * Migraciones: cada cambio de esquema añade una versión nueva con `this.version(n).stores(...)`
 * (solo los índices que cambian) y, si hace falta, `.upgrade(tx => ...)` para transformar datos.
 * Nunca se modifica una versión ya publicada.
 */
import Dexie, { type EntityTable } from 'dexie'

import type { CheckIn, Measurement, Profile, SessionLog } from '@/domain'
import type { MesocycleState, Plan } from '@/engine'

export const DB_NAME = 'forja'

export interface ProfileRow extends Profile {
  id: 'me'
  createdAt: number
  updatedAt: number
}

export const CONSENT_KINDS = ['health', 'terms'] as const
export type ConsentKind = (typeof CONSENT_KINDS)[number]

/** Registro de consentimiento con fecha y versión del texto aceptado (RGPD art. 7 y 9). */
export interface ConsentRow {
  kind: ConsentKind
  granted: boolean
  version: string
  at: number
}

export interface PlanRow {
  id: string
  /** Lunes de la semana del plan, `YYYY-MM-DD`. */
  weekStart: string
  createdAt: number
  /** 1 = plan vigente. Solo hay uno activo. */
  active: 0 | 1
  plan: Plan
  mesocycle: MesocycleState
  /** Razones de la adaptación semanal que llevó a este plan. */
  adaptation: Plan['reasons']
}

export interface AchievementRow {
  id: string
  unlockedAt: number
  seen: boolean
}

export interface SettingRow {
  key: string
  value: unknown
}

/** Sesión en curso, guardada a cada cambio para recuperarla tras recargar o cerrar la app. */
export interface ActiveSessionRow {
  id: 'current'
  session: SessionLog
  /** Estado de la interfaz de la sesión (ejercicio actual, descanso, sustituciones…). */
  state: unknown
}

export class ForjaDatabase extends Dexie {
  profile!: EntityTable<ProfileRow, 'id'>
  consents!: EntityTable<ConsentRow, 'kind'>
  plans!: EntityTable<PlanRow, 'id'>
  sessions!: EntityTable<SessionLog, 'id'>
  measurements!: EntityTable<Measurement, 'id'>
  checkIns!: EntityTable<CheckIn, 'weekStart'>
  achievements!: EntityTable<AchievementRow, 'id'>
  settings!: EntityTable<SettingRow, 'key'>
  activeSession!: EntityTable<ActiveSessionRow, 'id'>

  constructor(name = DB_NAME) {
    super(name)
    this.version(1).stores({
      profile: 'id',
      consents: 'kind',
      plans: 'id, weekStart, active, createdAt',
      sessions: 'id, date, startedAt, planId, dayId',
      measurements: 'id, date',
      checkIns: 'weekStart',
      achievements: 'id, unlockedAt',
      settings: 'key',
      activeSession: 'id',
    })
  }
}

export const db = new ForjaDatabase()

/** Tablas incluidas en la exportación y en el borrado total. */
export const TABLES = [
  'profile',
  'consents',
  'plans',
  'sessions',
  'measurements',
  'checkIns',
  'achievements',
  'settings',
  'activeSession',
] as const satisfies readonly Exclude<keyof ForjaDatabase, keyof Dexie>[]

export type TableName = (typeof TABLES)[number]
