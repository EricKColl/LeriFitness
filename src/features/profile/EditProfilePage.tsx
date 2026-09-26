import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { ProfileSchema, SEXES, type Profile } from '@/domain'
import { useCatalog } from '@/data/catalog'
import { useHealthConsent, useProfile } from '@/data/hooks'
import { regeneratePlan } from '@/data/plans'
import { saveProfile } from '@/data/profile'
import { Button } from '@/shared/ui/button'
import { FieldLabel, NumberStepper, Segmented } from '@/shared/ui/fields'
import { Page, Section } from '@/shared/ui/page'

import {
  EquipmentPicker,
  GoalPicker,
  InjuryPicker,
  JobPicker,
  LevelPicker,
  MinutesSlider,
  WeekdayPicker,
} from './profile-fields'

export function EditProfilePage() {
  const profile = useProfile()
  const consent = useHealthConsent()
  if (!profile || consent === undefined) return null
  return <EditProfile initial={profile} healthConsent={consent} />
}

function EditProfile({ initial, healthConsent }: { initial: Profile; healthConsent: boolean }) {
  const { t } = useTranslation(['profile', 'onboarding', 'domain', 'common'])
  const navigate = useNavigate()
  const catalog = useCatalog()
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const patch = (p: Partial<Profile>) => setDraft((d) => ({ ...d, ...p }))

  const save = async () => {
    if (draft.weekdays.length === 0) return toast.error(t('edit.noDays'))
    const parsed = ProfileSchema.safeParse({
      ...draft,
      injuries: healthConsent ? draft.injuries : [],
    })
    if (!parsed.success) return toast.error(t('common:errors.title'))
    setSaving(true)
    await saveProfile(parsed.data)
    await regeneratePlan(parsed.data, catalog)
    toast.success(t('edit.saved'))
    void navigate('/plan')
  }

  return (
    <Page back="/perfil" title={t('edit.title')} subtitle={t('edit.subtitle')}>
      <Section title={t('edit.goal')} className="mt-2">
        <GoalPicker value={draft.goal} onChange={(goal) => patch({ goal })} />
      </Section>
      <Section title={t('edit.level')}>
        <LevelPicker value={draft.level} onChange={(level) => patch({ level })} />
      </Section>
      <Section title={t('edit.body')}>
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel>{t('edit.sex')}</FieldLabel>
            <Segmented
              label={t('edit.sex')}
              value={draft.sex}
              onChange={(sex) => patch({ sex })}
              options={SEXES.map((s) => ({ value: s, label: t(`domain:sex.${s}`) }))}
            />
          </div>
          <div>
            <FieldLabel>{t('edit.age')}</FieldLabel>
            <NumberStepper
              label={t('edit.age')}
              value={draft.age}
              onChange={(age) => patch({ age: Math.round(age) })}
              min={14}
              max={100}
              unit={t('onboarding:body.ageUnit')}
            />
          </div>
          <div>
            <FieldLabel>{t('edit.height')}</FieldLabel>
            <NumberStepper
              label={t('edit.height')}
              value={draft.heightCm}
              onChange={(heightCm) => patch({ heightCm: Math.round(heightCm) })}
              min={120}
              max={230}
              unit="cm"
            />
          </div>
          <div>
            <FieldLabel>{t('edit.weight')}</FieldLabel>
            <NumberStepper
              label={t('edit.weight')}
              value={draft.weightKg}
              onChange={(weightKg) => patch({ weightKg })}
              min={30}
              max={300}
              step={0.5}
              unit="kg"
            />
          </div>
        </div>
      </Section>
      <Section title={t('edit.job')}>
        <JobPicker value={draft.job} onChange={(job) => patch({ job })} />
      </Section>
      <Section title={t('edit.days')}>
        <WeekdayPicker value={draft.weekdays} onChange={(weekdays) => patch({ weekdays })} />
      </Section>
      <Section title={t('edit.minutes')}>
        <MinutesSlider
          value={draft.minutesPerSession}
          onChange={(minutesPerSession) => patch({ minutesPerSession })}
        />
      </Section>
      <Section title={t('edit.equipment')}>
        <EquipmentPicker value={draft.equipment} onChange={(equipment) => patch({ equipment })} />
      </Section>
      <Section title={t('edit.injuries')}>
        {healthConsent ? (
          <>
            <p className="mb-3 text-sm text-muted-foreground">{t('common:consultProfessional')}</p>
            <InjuryPicker value={draft.injuries} onChange={(injuries) => patch({ injuries })} />
          </>
        ) : (
          <p className="surface p-4 text-sm text-muted-foreground">{t('edit.injuriesLocked')}</p>
        )}
      </Section>
      <div className="sticky bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+5.25rem)] z-10 mt-8">
        <Button
          size="xl"
          className="w-full shadow-xl"
          disabled={saving}
          onClick={() => void save()}
        >
          {t('edit.save')}
        </Button>
      </div>
    </Page>
  )
}
