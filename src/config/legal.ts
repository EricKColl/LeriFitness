/**
 * Datos del responsable del tratamiento (RGPD art. 13). Los aporta la persona titular de la app:
 * mientras estén vacíos, los textos legales lo indican con un aviso visible.
 */
export const LEGAL = {
  /** Nombre y apellidos (o razón social) del responsable. */
  controllerName: '',
  /** Correo de contacto para privacidad y derechos. */
  contactEmail: '',
  /** Fecha de la última revisión de los textos (coincide con CONSENT_VERSIONS). */
  updated: '2026-09-26',
} as const

export const LEGAL_DOCS = ['privacidad', 'terminos', 'salud', 'licencias'] as const
export type LegalDoc = (typeof LEGAL_DOCS)[number]
