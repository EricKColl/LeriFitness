import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  MEASUREMENT_FIELDS,
  MEASUREMENT_LIMITS,
  MeasurementSchema,
  type Measurement,
  type MeasurementField,
} from '@/domain'
import { db } from '@/data/db'
import { syncAchievements } from '@/features/achievements/sync'
import { today } from '@/shared/lib/dates'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'

type Draft = { date: string } & Partial<Record<MeasurementField, string>>

function toDraft(m?: Measurement): Draft {
  const draft: Draft = { date: m?.date ?? today() }
  for (const f of MEASUREMENT_FIELDS) {
    const v = m?.[f]
    if (v !== undefined) draft[f] = String(v).replace('.', ',')
  }
  return draft
}

export function MeasurementSheet({
  measurement,
  open,
  onOpenChange,
}: {
  measurement?: Measurement
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation(['progress', 'common'])
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="px-5 pt-6 pb-6">
        <SheetHeader className="p-0 pr-10 text-left">
          <SheetTitle className="font-display text-2xl font-extrabold">
            {measurement ? t('body.edit') : t('body.add')}
          </SheetTitle>
          <SheetDescription>{t('body.optional')}</SheetDescription>
        </SheetHeader>
        {open && (
          <MeasurementForm
            key={measurement?.id ?? 'new'}
            measurement={measurement}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function MeasurementForm({
  measurement,
  onDone,
}: {
  measurement?: Measurement
  onDone: () => void
}) {
  const { t } = useTranslation(['progress', 'common'])
  const [draft, setDraft] = useState(() => toDraft(measurement))

  const save = async () => {
    const values: Record<string, unknown> = {
      id: measurement?.id ?? `m-${Date.now().toString(36)}`,
      date: draft.date,
    }
    let any = false
    for (const f of MEASUREMENT_FIELDS) {
      const raw = draft[f]?.trim()
      if (!raw) continue
      values[f] = Number(raw.replace(',', '.'))
      any = true
    }
    if (!any) return toast.error(t('body.nothing'))
    const parsed = MeasurementSchema.safeParse(values)
    if (!parsed.success) return toast.error(t('body.invalid'))
    await db.measurements.put(parsed.data)
    await syncAchievements()
    toast.success(t('body.saved'))
    onDone()
  }

  const remove = async () => {
    if (!measurement) return
    await db.measurements.delete(measurement.id)
    toast(t('body.deleted'))
    onDone()
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t('body.date')}
        <Input
          type="date"
          value={draft.date}
          max={today()}
          required
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        {MEASUREMENT_FIELDS.map((f) => (
          <label key={f} className="flex flex-col gap-1 text-sm font-medium">
            {t(`body.fields.${f}`)}
            <Input
              inputMode="decimal"
              value={draft[f] ?? ''}
              placeholder={`${MEASUREMENT_LIMITS[f].min}–${MEASUREMENT_LIMITS[f].max}`}
              onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <Button type="submit" size="lg" className="mt-2">
        {t('common:actions.save')}
      </Button>
      {measurement && (
        <Button
          type="button"
          variant="ghost"
          className="text-destructive"
          onClick={() => void remove()}
        >
          {t('common:actions.delete')}
        </Button>
      )}
    </form>
  )
}
