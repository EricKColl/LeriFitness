import { useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useInstallPrompt } from '@/shared/hooks/use-install-prompt'
import { usePrefs } from '@/shared/stores/prefs'
import { Button } from '@/shared/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'

/** Tras descartarla, la invitación vuelve a los 30 días. */
const SNOOZE_MS = 30 * 86_400_000

export function InstallCard({ now }: { now: number }) {
  const { t } = useTranslation()
  const install = useInstallPrompt()
  const { installDismissedAt, set } = usePrefs()
  const [iosOpen, setIosOpen] = useState(false)
  const snoozed = installDismissedAt !== null && now - installDismissedAt < SNOOZE_MS
  if (install.installed || snoozed || (!install.canPrompt && !install.ios)) return null

  return (
    <>
      <div className="surface relative mt-7 flex items-center gap-4 p-4 pr-12">
        <span className="bg-ember-gradient grid size-12 shrink-0 place-items-center rounded-2xl text-primary-foreground">
          <Download className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t('pwa.installTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('pwa.installBody')}</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => (install.ios ? setIosOpen(true) : void install.prompt())}
          >
            {t('pwa.installAction')}
          </Button>
        </div>
        <button
          type="button"
          aria-label={t('pwa.dismiss')}
          onClick={() => set({ installDismissedAt: now })}
          className="absolute top-2 right-2 grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <X className="size-5" />
        </button>
      </div>
      <Sheet open={iosOpen} onOpenChange={setIosOpen}>
        <SheetContent side="bottom" className="px-5 pt-6 pb-6">
          <SheetHeader className="p-0 pr-10 text-left">
            <SheetTitle className="font-display text-2xl font-extrabold">
              {t('pwa.iosTitle')}
            </SheetTitle>
            <SheetDescription className="sr-only">{t('pwa.installBody')}</SheetDescription>
          </SheetHeader>
          <ol className="flex flex-col gap-3">
            {t('pwa.iosSteps', { returnObjects: true }).map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary font-bold">
                  {i + 1}
                </span>
                <span className="pt-1">
                  {step}
                  {i === 1 && <Share className="ml-1 inline size-4 align-[-2px]" aria-hidden />}
                </span>
              </li>
            ))}
          </ol>
        </SheetContent>
      </Sheet>
    </>
  )
}
