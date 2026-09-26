import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import es from './locales/es'

export const SUPPORTED_LANGUAGES = ['es'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'es'

export const resources = { es } as const

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  ns: Object.keys(es),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
