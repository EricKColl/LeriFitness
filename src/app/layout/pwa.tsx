import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'

import { useOnline } from '@/shared/hooks/use-online'

/** Registra el service worker y avisa cuando hay una versión nueva. */
export function UpdatePrompt() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Comprueba si hay versión nueva cada hora mientras la app está abierta.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    toast(t('pwa.updateTitle'), {
      id: 'sw-update',
      description: t('pwa.updateBody'),
      duration: Infinity,
      action: { label: t('pwa.updateAction'), onClick: () => void updateServiceWorker(true) },
    })
  }, [needRefresh, t, updateServiceWorker])

  useEffect(() => {
    if (!offlineReady) return
    toast.success(t('pwa.offlineReady'), { id: 'sw-offline' })
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady, t])

  return null
}

/**
 * Aviso breve al quedarse sin conexión. Como todo funciona sin red, no hace falta dejarlo fijo:
 * desaparece a los pocos segundos.
 */
export function OfflineBanner() {
  const online = useOnline()
  const { t } = useTranslation()
  const [visible, setVisible] = useState(!online)
  const [wasOnline, setWasOnline] = useState(online)
  if (online !== wasOnline) {
    setWasOnline(online)
    setVisible(!online)
  }
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(timer)
  }, [visible])
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-safe"
        >
          <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-steel-soft px-3 py-1.5 text-xs font-semibold text-steel shadow-lg">
            <WifiOff className="size-3.5" aria-hidden />
            {t('pwa.offline')}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
