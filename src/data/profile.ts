import type { Profile } from '@/domain'

import { db, type ConsentKind, type ProfileRow } from './db'

/**
 * Versión vigente de cada texto legal. Si cambia un texto, se sube la versión y la app vuelve a
 * pedir el consentimiento.
 */
export const CONSENT_VERSIONS: Record<ConsentKind, string> = {
  health: '2026-09-26',
  terms: '2026-09-26',
  cloud: '2026-09-26',
}

export async function saveProfile(profile: Profile) {
  const now = Date.now()
  const existing = await db.profile.get('me')
  const row: ProfileRow = {
    ...profile,
    id: 'me',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await db.profile.put(row)
  return row
}

export async function recordConsent(kind: ConsentKind, granted: boolean) {
  await db.consents.put({ kind, granted, version: CONSENT_VERSIONS[kind], at: Date.now() })
}

/** ¿Hay consentimiento vigente (y de la versión actual del texto) para este tratamiento? */
export async function hasConsent(kind: ConsentKind) {
  const row = await db.consents.get(kind)
  return !!row?.granted && row.version === CONSENT_VERSIONS[kind]
}

/**
 * Retirar el consentimiento de datos de salud: se borran las lesiones del perfil y los check-ins
 * (que incluyen molestias). Devuelve el perfil sin datos de salud.
 */
export async function revokeHealthConsent() {
  await recordConsent('health', false)
  const row = await db.profile.get('me')
  await db.checkIns.clear()
  if (!row) return null
  const updated = { ...row, injuries: [], updatedAt: Date.now() }
  await db.profile.put(updated)
  return updated
}
