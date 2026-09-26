import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { useAchievements } from '@/data/hooks'
import { usePrefs } from '@/shared/stores/prefs'
import { Button } from '@/shared/ui/button'

import { AchievementBadge } from './badge'
import { ACHIEVEMENTS } from './definitions'
import { markAchievementsSeen } from './sync'

const RAYS = Array.from({ length: 12 }, (_, i) => i * 30)

/**
 * Celebración a pantalla completa de los logros nuevos (sin ver). Con movimiento reducido se
 * muestra sin animación. Se cierra con el botón o Escape.
 */
export function AchievementCelebration() {
  const { t } = useTranslation(['achievements', 'common'])
  const reduced = useReducedMotion()
  const vibration = usePrefs((s) => s.vibration)
  const unseen = (useAchievements() ?? []).filter((a) => !a.seen)
  const defs = unseen
    .map((a) => ACHIEVEMENTS.find((d) => d.id === a.id))
    .filter((d) => d !== undefined)
  const [index, setIndex] = useState(0)
  const current = defs[Math.min(index, defs.length - 1)]
  const open = defs.length > 0

  useEffect(() => {
    if (open && vibration) navigator.vibrate?.([60, 40, 120])
  }, [open, vibration])

  const close = () => {
    void markAchievementsSeen(unseen.map((a) => a.id))
    setIndex(0)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-background/92 px-8 backdrop-blur-md"
        >
          <div className="flex max-w-sm flex-col items-center text-center">
            <p className="text-sm font-semibold tracking-wider text-primary uppercase">
              {defs.length > 1 ? t('unlockedMany', { count: defs.length }) : t('unlocked')}
            </p>
            <div className="relative my-8 grid size-56 place-items-center">
              {!reduced && (
                <motion.div
                  className="absolute inset-0"
                  initial={{ rotate: 0, opacity: 0 }}
                  animate={{ rotate: 360, opacity: 1 }}
                  transition={{
                    rotate: { duration: 24, repeat: Infinity, ease: 'linear' },
                    opacity: { duration: 0.6 },
                  }}
                >
                  {RAYS.map((deg) => (
                    <span
                      key={deg}
                      className="absolute top-1/2 left-1/2 h-1 w-28 origin-left rounded-full bg-gradient-to-r from-[var(--ember-hot)] to-transparent opacity-50"
                      style={{ transform: `rotate(${deg}deg)` }}
                    />
                  ))}
                </motion.div>
              )}
              <motion.div
                key={current.id}
                initial={reduced ? false : { scale: 0.2, rotate: -25, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              >
                <AchievementBadge
                  icon={current.icon}
                  tier={current.tier}
                  unlocked
                  className="size-36 drop-shadow-[0_0_40px_var(--ember)]"
                />
              </motion.div>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              {t(`tiers.${current.tier}`)}
            </p>
            <h2 id="achievement-title" className="mt-1 text-3xl font-extrabold">
              {t(`items.${current.id}.name` as 'items.firstSession.name')}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t(`items.${current.id}.body` as 'items.firstSession.body')}
            </p>
            <Button
              size="lg"
              className="mt-8 min-w-48"
              autoFocus
              onClick={() => (index < defs.length - 1 ? setIndex(index + 1) : close())}
            >
              {index < defs.length - 1 ? t('common:actions.continue') : t('great')}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
