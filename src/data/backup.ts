/**
 * Derechos del usuario sobre sus datos (RGPD): exportar todo a un JSON, importarlo y borrarlo todo
 * en un clic. Nada sale del dispositivo salvo el archivo que el propio usuario descarga.
 */
import { z } from 'zod'

import { CheckInSchema, MeasurementSchema, ProfileSchema, SessionLogSchema } from '@/domain'

import { CONSENT_KINDS, db, DB_NAME, TABLES, type TableName } from './db'

export const EXPORT_FORMAT = 1

const PlanRowSchema = z.object({
  id: z.string(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.number(),
  active: z.union([z.literal(0), z.literal(1)]),
  plan: z.looseObject({ engineVersion: z.number(), days: z.array(z.unknown()) }),
  mesocycle: z.looseObject({ index: z.number(), week: z.number(), length: z.number() }),
  adaptation: z.array(z.looseObject({ key: z.string() })),
})

const ROW_SCHEMAS: Record<TableName, z.ZodType> = {
  profile: ProfileSchema.extend({
    id: z.literal('me'),
    createdAt: z.number(),
    updatedAt: z.number(),
  }),
  consents: z.object({
    kind: z.enum(CONSENT_KINDS),
    granted: z.boolean(),
    version: z.string(),
    at: z.number(),
  }),
  plans: PlanRowSchema,
  sessions: SessionLogSchema,
  measurements: MeasurementSchema,
  checkIns: CheckInSchema,
  achievements: z.object({ id: z.string(), unlockedAt: z.number(), seen: z.boolean() }),
  settings: z.object({ key: z.string(), value: z.unknown() }),
  activeSession: z.looseObject({ id: z.literal('current'), session: SessionLogSchema }),
}

const ExportSchema = z.object({
  app: z.literal('forja'),
  format: z.literal(EXPORT_FORMAT),
  exportedAt: z.string(),
  data: z.partialRecord(z.enum(TABLES), z.array(z.unknown())),
})

export type ExportFile = z.infer<typeof ExportSchema>

export async function exportAll(): Promise<ExportFile> {
  const data: ExportFile['data'] = {}
  for (const table of TABLES) data[table] = await db.table(table).toArray()
  return { app: 'forja', format: EXPORT_FORMAT, exportedAt: new Date().toISOString(), data }
}

export function exportFileName(date = new Date()) {
  return `forja-datos-${date.toISOString().slice(0, 10)}.json`
}

/** Descarga la exportación como archivo JSON. */
export async function downloadExport() {
  const blob = new Blob([JSON.stringify(await exportAll(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFileName()
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type ImportErrorReason = 'invalidJson' | 'invalidFormat' | 'invalidRows'

export class ImportError extends Error {
  readonly reason: ImportErrorReason

  constructor(reason: ImportErrorReason, message?: string) {
    super(message ?? reason)
    this.reason = reason
  }
}

/** Valida un archivo de exportación. Lanza `ImportError` si no es válido. */
export function parseExport(text: string) {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new ImportError('invalidJson')
  }
  const parsed = ExportSchema.safeParse(json)
  if (!parsed.success) throw new ImportError('invalidFormat', z.prettifyError(parsed.error))
  const rows: Partial<Record<TableName, unknown[]>> = {}
  for (const table of TABLES) {
    const list = parsed.data.data[table] ?? []
    const result = z.array(ROW_SCHEMAS[table]).safeParse(list)
    if (!result.success)
      throw new ImportError('invalidRows', `${table}: ${z.prettifyError(result.error)}`)
    rows[table] = result.data
  }
  return rows
}

/** Sustituye todos los datos locales por los del archivo. */
export async function importAll(text: string) {
  const rows = parseExport(text)
  await db.transaction(
    'rw',
    TABLES.map((t) => db.table(t)),
    async () => {
      for (const table of TABLES) {
        await db.table(table).clear()
        const list = rows[table]
        if (list?.length) await db.table(table).bulkPut(list)
      }
    },
  )
  return rows
}

/**
 * Borrado total: base de datos, cachés del service worker y almacenamiento local. Tras llamarla,
 * la app debe recargarse para volver al onboarding.
 */
export async function wipeAll() {
  db.close()
  await db.delete()
  // Por si otra pestaña tenía la base abierta con otra instancia.
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = request.onerror = request.onblocked = () => resolve()
  })
  if ('caches' in globalThis) {
    for (const key of await caches.keys()) await caches.delete(key)
  }
  localStorage.clear()
  sessionStorage.clear()
}
