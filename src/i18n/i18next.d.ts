import 'i18next'

import type es from './locales/es'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof es
  }
}
