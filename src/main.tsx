import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/inter'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import './styles/index.css'
import './i18n'

import { App } from './app/App'
import { initTheme } from './shared/stores/theme'

initTheme()

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró el elemento #root')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
