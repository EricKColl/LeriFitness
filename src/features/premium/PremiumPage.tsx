import { Check, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/shared/ui/badge'
import { Page, Section } from '@/shared/ui/page'

import { usePlan } from './entitlements'
import { FREE_FEATURES, PREMIUM_FEATURES } from './features'

export function PremiumPage() {
  const { t } = useTranslation('premium')
  const plan = usePlan()
  return (
    <Page back="/perfil" title={t('title')} subtitle={t('subtitle')}>
      <Badge variant="ember">{t('current', { plan: t(`plans.${plan}`) })}</Badge>
      <Section title={t('freeTitle')} className="mt-2">
        <ul className="surface flex flex-col gap-2.5 p-4 text-sm">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              {t(`features.${f}`)}
            </li>
          ))}
        </ul>
      </Section>
      <Section title={t('premiumTitle')}>
        <ul className="surface flex flex-col gap-2.5 p-4 text-sm text-muted-foreground">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f} className="flex gap-2.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              {t(`features.${f}`)}
            </li>
          ))}
        </ul>
      </Section>
      <p className="mt-6 text-sm text-muted-foreground">{t('noPayments')}</p>
    </Page>
  )
}
