import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { LogoMark } from '@/shared/ui/logo'

/** Pantalla de carga con la llama de la marca. */
export function Splash({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div role="status" className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-5">
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          <div className="absolute inset-0 -z-10 rounded-full bg-primary/30 blur-2xl" />
          <LogoMark className="size-16" />
        </motion.div>
        <p className="text-sm text-muted-foreground">{label ?? t('loading')}</p>
      </div>
    </div>
  )
}
