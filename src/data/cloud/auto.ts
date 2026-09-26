import { cloudConfigured } from './client'

/**
 * Sincroniza en segundo plano si la nube está configurada y hay sesión iniciada (al abrir la
 * app y al terminar una sesión). Los fallos se ignoran: se reintentará la próxima vez.
 */
export function syncInBackground() {
  if (!cloudConfigured()) return
  void import('./account').then((m) => m.syncNow()).catch(() => undefined)
}
