import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { LogoMark } from '@/shared/ui/logo'

/** Chispas deterministas (sin azar) para que la animación sea igual en cada render. */
const SPARKS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 + (i % 3) * 0.35
  const distance = 90 + ((i * 37) % 70)
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance - 40,
    delay: (i % 6) * 0.22,
    size: 3 + (i % 3),
  }
})

export function Forging() {
  const { t } = useTranslation('onboarding')
  const reduced = useReducedMotion()
  const steps = t('forging.steps', { returnObjects: true })
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), 620)
    return () => clearInterval(timer)
  }, [steps.length])

  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-dvh place-items-center overflow-hidden"
    >
      <div className="flex flex-col items-center gap-10">
        <div className="relative grid size-48 place-items-center">
          <motion.div
            className="absolute inset-0 rounded-full bg-[radial-gradient(circle,oklch(from_var(--ember)_l_c_h/0.55),transparent_65%)]"
            animate={
              reduced ? undefined : { scale: [0.8, 1.15, 0.95, 1.2], opacity: [0.5, 1, 0.8, 1] }
            }
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          {!reduced &&
            SPARKS.map((spark, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-ember-hot shadow-[0_0_8px_var(--ember-hot)]"
                style={{ width: spark.size, height: spark.size }}
                initial={{ x: 0, y: 10, opacity: 0 }}
                animate={{ x: spark.x, y: spark.y, opacity: [0, 1, 0] }}
                transition={{
                  duration: 1.4,
                  delay: spark.delay,
                  repeat: Infinity,
                  repeatDelay: 0.4,
                  ease: 'easeOut',
                }}
              />
            ))}
          <motion.div
            initial={reduced ? false : { scale: 0.4, rotate: -8 }}
            animate={reduced ? undefined : { scale: [0.9, 1.05, 1], rotate: 0 }}
            transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <LogoMark className="size-24 drop-shadow-[0_0_30px_var(--ember)]" />
          </motion.div>
        </div>
        <div className="flex flex-col items-center gap-3 px-8 text-center">
          <h1 className="text-3xl font-extrabold">{t('forging.title')}</h1>
          <div className="h-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-muted-foreground"
              >
                {steps[index]}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="bg-ember-gradient h-full rounded-full"
              initial={{ width: '8%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
