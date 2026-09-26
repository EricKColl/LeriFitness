import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { LEGAL, LEGAL_DOCS, type LegalDoc } from '@/config/legal'
import { fromISODate } from '@/shared/lib/dates'
import { EmptyState, Page } from '@/shared/ui/page'

interface LegalSection {
  title: string
  body: string[]
}

export function LegalPage() {
  const { doc } = useParams()
  const { t, i18n } = useTranslation('legal')
  if (!LEGAL_DOCS.includes(doc as LegalDoc))
    return (
      <Page back>
        <EmptyState title={t('notFound')} />
      </Page>
    )
  const id = doc as LegalDoc
  const pending = !LEGAL.controllerName || !LEGAL.contactEmail
  const values = {
    controller: LEGAL.controllerName || `[${t('pending')}]`,
    email: LEGAL.contactEmail || `[${t('pending')}]`,
    interpolation: { escapeValue: false },
  }
  // i18next interpola también dentro de los objetos devueltos ({{controller}}, {{email}}).
  const sections = t(`docs.${id}.sections`, {
    returnObjects: true,
    ...values,
  }) as unknown as LegalSection[]

  return (
    <Page
      back
      title={t(`docs.${id}.title`)}
      subtitle={t('updated', {
        date: fromISODate(LEGAL.updated).toLocaleDateString(i18n.language, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      })}
      className="pb-16"
    >
      {pending && (id === 'privacidad' || id === 'terminos') && (
        <p className="mb-4 flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <TriangleAlert className="size-5 shrink-0 text-warning" />
          {t('pendingNotice')}
        </p>
      )}
      <p className="text-base leading-relaxed">{t(`docs.${id}.intro`)}</p>
      {sections.map((section) => (
        <section key={section.title} className="mt-7">
          <h2 className="text-lg font-bold">{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="mt-2 leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </Page>
  )
}
