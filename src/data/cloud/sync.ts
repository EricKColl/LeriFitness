/**
 * Sincronización opcional entre dispositivos. La base local sigue siendo la fuente de verdad;
 * la nube guarda una copia de un subconjunto mínimo de datos:
 *
 * - perfil SIN lesiones (las lesiones son datos de salud y no salen del dispositivo),
 * - sesiones SIN notas (el texto libre podría mencionar dolores),
 * - logros.
 *
 * Nunca se sincronizan check-ins (molestias), medidas corporales, consentimientos ni planes (el
 * plan se regenera en cada dispositivo a partir del perfil y del historial).
 *
 * Algoritmo: se sube lo que ha cambiado desde la última sincronización (comparando huellas del
 * contenido) y después se descarga lo que otros dispositivos hayan cambiado desde entonces (según
 * la hora del servidor). En caso de conflicto gana la última escritura.
 */
import { SessionLogSchema, type SessionLog } from '@/domain'

import { db, type AchievementRow, type ProfileRow } from '../db'

export const SYNCED_COLLECTIONS = ['profile', 'sessions', 'achievements'] as const
export type SyncedCollection = (typeof SYNCED_COLLECTIONS)[number]

export interface RemoteRow {
  collection: SyncedCollection
  id: string
  data: unknown
  deleted: boolean
  /** Hora del servidor (ISO) en la que se escribió la fila. */
  updated_at?: string
}

/** Almacén remoto (Supabase en producción; uno en memoria en los tests). */
export interface RemoteStore {
  push: (rows: RemoteRow[]) => Promise<void>
  /** Filas modificadas después de `since` (ISO), ordenadas por hora del servidor. */
  pull: (since: string | null) => Promise<RemoteRow[]>
}

interface SyncState {
  hashes: Record<string, string>
  lastPull: string | null
  lastSync: number | null
}

const STATE_KEY = 'sync:state'
const EMPTY: SyncState = { hashes: {}, lastPull: null, lastSync: null }

export async function getSyncState(): Promise<SyncState> {
  const row = await db.settings.get(STATE_KEY)
  return { ...EMPTY, ...(row?.value as Partial<SyncState> | undefined) }
}

async function setSyncState(state: SyncState) {
  await db.settings.put({ key: STATE_KEY, value: state })
}

export async function resetSyncState() {
  await db.settings.delete(STATE_KEY)
}

/** JSON con las claves ordenadas: la misma información da siempre el mismo texto. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
      .join(',')}}`
  return JSON.stringify(value)
}

function fingerprint(value: unknown) {
  const text = stableStringify(value)
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${(h >>> 0).toString(36)}-${text.length}`
}

const key = (collection: SyncedCollection, id: string) => `${collection}/${id}`

/** Versión «para la nube» de cada registro: sin datos de salud ni texto libre. */
export function sanitizeProfile(row: ProfileRow) {
  const { injuries: _injuries, ...rest } = row
  return rest
}

export function sanitizeSession(session: SessionLog) {
  const { notes: _notes, ...rest } = session
  return rest
}

async function localRows() {
  const [profile, sessions, achievements] = await Promise.all([
    db.profile.get('me'),
    db.sessions.toArray(),
    db.achievements.toArray(),
  ])
  const rows = new Map<string, RemoteRow>()
  if (profile)
    rows.set(key('profile', 'me'), {
      collection: 'profile',
      id: 'me',
      data: sanitizeProfile(profile),
      deleted: false,
    })
  // Las sesiones en curso no se suben hasta terminar.
  for (const s of sessions)
    if (s.endedAt !== null)
      rows.set(key('sessions', s.id), {
        collection: 'sessions',
        id: s.id,
        data: sanitizeSession(s),
        deleted: false,
      })
  for (const a of achievements)
    rows.set(key('achievements', a.id), {
      collection: 'achievements',
      id: a.id,
      data: a,
      deleted: false,
    })
  return rows
}

/** Qué hay que subir: lo nuevo o cambiado, y borrados de lo que ya no existe en local. */
export function computePush(local: ReadonlyMap<string, RemoteRow>, hashes: Record<string, string>) {
  const upserts: RemoteRow[] = []
  for (const [k, row] of local) if (hashes[k] !== fingerprint(row.data)) upserts.push(row)
  const deletes: RemoteRow[] = Object.keys(hashes)
    .filter((k) => !local.has(k))
    .map((k) => {
      const [collection, ...id] = k.split('/')
      return {
        collection: collection as SyncedCollection,
        id: id.join('/'),
        data: {},
        deleted: true,
      }
    })
  return { upserts, deletes }
}

async function applyRemote(row: RemoteRow) {
  if (row.collection === 'profile') {
    if (row.deleted) return
    const local = await db.profile.get('me')
    // Las lesiones nunca vienen de la nube: se conservan las del dispositivo.
    await db.profile.put({ ...(row.data as ProfileRow), id: 'me', injuries: local?.injuries ?? [] })
  } else if (row.collection === 'sessions') {
    if (row.deleted) return db.sessions.delete(row.id)
    const parsed = SessionLogSchema.safeParse(row.data)
    if (!parsed.success) return
    const local = await db.sessions.get(row.id)
    await db.sessions.put({ ...parsed.data, ...(local?.notes ? { notes: local.notes } : {}) })
  } else {
    if (row.deleted) return db.achievements.delete(row.id)
    const local = await db.achievements.get(row.id)
    // Si ya se vio en este dispositivo, no se vuelve a celebrar.
    await db.achievements.put({ ...(row.data as AchievementRow), seen: local?.seen ?? true })
  }
}

export interface SyncResult {
  pushed: number
  pulled: number
}

export async function sync(remote: RemoteStore): Promise<SyncResult> {
  const state = await getSyncState()
  const { upserts, deletes } = computePush(await localRows(), state.hashes)
  if (upserts.length || deletes.length) await remote.push([...upserts, ...deletes])

  const incoming = await remote.pull(state.lastPull)
  for (const row of incoming) await applyRemote(row)
  const lastPull = incoming.reduce<string | null>(
    (latest, r) => (r.updated_at && (!latest || r.updated_at > latest) ? r.updated_at : latest),
    state.lastPull,
  )

  const hashes: Record<string, string> = {}
  for (const [k, row] of await localRows()) hashes[k] = fingerprint(row.data)
  await setSyncState({ hashes, lastPull, lastSync: Date.now() })
  return { pushed: upserts.length + deletes.length, pulled: incoming.length }
}
