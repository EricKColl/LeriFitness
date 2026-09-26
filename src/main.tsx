import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/inter'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import './styles/index.css'
import './i18n'

import { App } from './app/App'
import { initTheme } from './shared/stores/theme'

initTheme()

if (import.meta.env.DEV) void import('./app/dev-tools')

// Si se abre la app desde el enlace de inicio de sesión del email, se recoge la sesión antes de
// que el enrutador cambie la URL. Sin nube configurada, no se carga nada.
if (/access_token=|error_description=/.test(location.hash))
  await import('./data/cloud/account').then((m) => m.completeSignInFromUrl())

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró el elemento #root')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
