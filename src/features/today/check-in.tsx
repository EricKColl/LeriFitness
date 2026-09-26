import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { INJURY_ZONES, type CheckIn, type InjuryZone } from '@/domain'
import { useCatalog } from '@/data/catalog'
import { useHealthConsent } from '@/data/hooks'
import { applyCheckIn, getActivePlan } from '@/data/plans'
import { syncAchievements } from '@/features/achievements/sync'
import { fromISODate } from '@/shared/lib/dates'
import { Button } from '@/shared/ui/button'
import { Chip, FieldLabel, Segmented } from '@/shared/ui/fields'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'

type Scale = 'energy' | 'sleep' | 'soreness'
const SCALES: Scale[] = ['energy', 'sleep', 'soreness']
const LEVELS = ['1', '2', '3', '4', '5'] as const

/** Check-in semanal (opcional): cómo llegas a la semana. Las molestias solo con consentimiento. */
export function CheckInSheet({
  weekStart,
  open,
  onOpenChange,
}: {
  weekStart: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t, i18n } = useTranslation(['today', 'domain'])
  const catalog = useCatalog()
  const consent = useHealthConsent()
  const [values, setValues] = useState<Record<Scale, number>>({ energy: 3, sleep: 3, soreness: 2 })
  const [pain, setPain] = useState<InjuryZone[]>([])
  const [saving, setSaving] = useState(false)
  const date = fromISODate(weekStart).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'long',
  })

  const save = async () => {
    setSaving(true)
    const checkIn: CheckIn = { weekStart, ...values, pain: consent ? pain : [] }
    const previous = (await getActivePlan())?.id
    const plan = await applyCheckIn(checkIn, catalog)
    await syncAchievements()
    setSaving(false)
    onOpenChange(false)
    toast.success(plan?.id !== previous ? t('checkIn.savedAdjusted') : t('checkIn.savedLate'))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="px-5 pt-6 pb-6">
        <SheetHeader className="p-0 pr-10 text-left">
          <SheetTitle className="font-display text-2xl font-extrabold">
            {t('checkIn.title')}
          </SheetTitle>
          <SheetDescription>{t('checkIn.subtitle', { date })}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5">
          {SCALES.map((scale) => (
            <div key={scale}>
              <FieldLabel>{t(`checkIn.${scale}`)}</FieldLabel>
              <Segmented
                label={t(`checkIn.${scale}`)}
                value={String(values[scale]) as (typeof LEVELS)[number]}
                onChange={(v) => setValues({ ...values, [scale]: Number(v) })}
                options={LEVELS.map((l) => ({ value: l, label: l }))}
              />
              <div className="mt-1 flex justify-between px-1 text-xs text-muted-foreground">
                <span>{t(`checkIn.${scale}Low`)}</span>
                <span>{t(`checkIn.${scale}High`)}</span>
              </div>
            </div>
          ))}
          <div>
            <FieldLabel>{t('checkIn.pain')}</FieldLabel>
            {consent ? (
              <div className="flex flex-wrap gap-2">
                <p className="mb-1 w-full text-xs text-muted-foreground">{t('checkIn.painHint')}</p>
                {INJURY_ZONES.map((zone) => {
                  const selected = pain.includes(zone)
                  return (
                    <Chip
                      key={zone}
                      selected={selected}
                      onClick={() =>
                        setPain(selected ? pain.filter((z) => z !== zone) : [...pain, zone])
                      }
                    >
                      {t(`domain:injuryZones.${zone}`)}
                    </Chip>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('checkIn.painNoConsent')}</p>
            )}
          </div>
          <Button size="lg" onClick={() => void save()} disabled={saving}>
            {t('checkIn.save')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
