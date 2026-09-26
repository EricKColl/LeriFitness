/**
 * Datos del responsable del tratamiento (RGPD art. 13), aportados por el titular de la app.
 * Si se vaciaran, los textos legales lo indicarían con un aviso visible.
 */
export const LEGAL = {
  /** Nombre y apellidos (o razón social) del responsable. */
  controllerName: 'Erick Coll Rodríguez',
  /** Correo de contacto para privacidad y derechos. */
  contactEmail: 'erickcollrodriguez@gmail.com',
  /** Fecha de la última revisión de los textos (coincide con CONSENT_VERSIONS). */
  updated: '2026-09-26',
} as const

export const LEGAL_DOCS = ['privacidad', 'terminos', 'salud', 'licencias'] as const
export type LegalDoc = (typeof LEGAL_DOCS)[number]
