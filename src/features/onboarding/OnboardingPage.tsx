import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, CloudOff, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { SEXES, type Weekday } from '@/domain'
import { importAll } from '@/data/backup'
import { loadCatalog } from '@/data/catalog'
import { createFirstPlan } from '@/data/plans'
import { recordConsent, saveProfile } from '@/data/profile'
import {
  EquipmentPicker,
  GoalPicker,
  InjuryPicker,
  JobPicker,
  LevelPicker,
  MinutesSlider,
  WeekdayPicker,
} from '@/features/profile/profile-fields'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { FieldLabel, NumberStepper, Segmented } from '@/shared/ui/fields'
import { LogoMark } from '@/shared/ui/logo'

import { Forging } from './forging'
import { draftToProfile, useOnboarding } from './store'

const STEPS = [
  'welcome',
  'goal',
  'level',
  'body',
  'job',
  'availability',
  'equipment',
  'consent',
  'injuries',
  'summary',
] as const
type StepId = (typeof STEPS)[number]

export function OnboardingPage() {
  const { t } = useTranslation(['onboarding', 'common'])
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const { step, direction, draft, healthConsent, termsAccepted, go } = useOnboarding()
  const [forging, setForging] = useState(false)
  const id = STEPS[step] ?? 'welcome'

  const canContinue: Record<StepId, boolean> = {
    welcome: true,
    goal: !!draft.goal,
    level: !!draft.level,
    body: !!draft.sex,
    job: !!draft.job,
    availability: draft.weekdays.length > 0,
    equipment: true,
    consent: true,
    injuries: true,
    summary: termsAccepted,
  }

  const next = () => {
    if (id === 'consent' && !healthConsent) return go(STEPS.indexOf('summary'))
    if (id === 'summary') return void finish()
    go(step + 1)
  }
  const back = () => {
    if (id === 'summary' && !healthConsent) return go(STEPS.indexOf('consent'))
    go(Math.max(0, step - 1))
  }

  async function finish() {
    const profile = draftToProfile(draft, healthConsent)
    if (!profile) return
    setForging(true)
    const started = Date.now()
    await recordConsent('terms', true)
    await recordConsent('health', healthConsent)
    await createFirstPlan(profile, await loadCatalog())
    // Deja ver la animación completa aunque el plan se genere al instante.
    await new Promise((r) => setTimeout(r, Math.max(0, 2600 - (Date.now() - started))))
    // El perfil se guarda al final: al existir, la app sale del onboarding.
    await saveProfile(profile)
    useOnboarding.getState().reset()
    void navigate('/hoy', { replace: true })
  }

  if (forging) return <Forging />
  if (id === 'welcome') return <Welcome onStart={() => go(1)} />

  const total = STEPS.length - 1
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col pt-safe">
      <div className="flex items-center gap-3 px-5 pt-4">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-3"
          onClick={back}
          aria-label={t('common:actions.back')}
        >
          <ChevronLeft className="size-6" />
        </Button>
        <div
          className="flex flex-1 gap-1"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step}
          aria-label={t('progress', { current: step, total })}
        >
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-500',
                i < step ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>
      </div>

      <div className="relative flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={id}
            custom={direction}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 40 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -40 * direction }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 pt-6 pb-32"
          >
            <StepContent id={id} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-safe">
        <div className="mx-auto max-w-lg px-5 pb-2">
          <Button size="lg" className="w-full" disabled={!canContinue[id]} onClick={next}>
            {id === 'summary' ? t('summary.create') : t('common:actions.continue')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function StepHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl leading-tight font-extrabold text-balance">{title}</h1>
      {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

function StepContent({ id }: { id: StepId }) {
  const { t } = useTranslation(['onboarding', 'domain', 'common'])
  const { draft, patch, healthConsent, setHealthConsent, termsAccepted, setTermsAccepted } =
    useOnboarding()

  switch (id) {
    case 'goal':
      return (
        <>
          <StepHeader title={t('goal.title')} subtitle={t('goal.subtitle')} />
          <GoalPicker value={draft.goal} onChange={(goal) => patch({ goal })} />
        </>
      )
    case 'level':
      return (
        <>
          <StepHeader title={t('level.title')} subtitle={t('level.subtitle')} />
          <LevelPicker value={draft.level} onChange={(level) => patch({ level })} />
        </>
      )
    case 'body':
      return (
        <>
          <StepHeader title={t('body.title')} subtitle={t('body.subtitle')} />
          <div className="flex flex-col gap-6">
            <div>
              <FieldLabel>{t('body.sex')}</FieldLabel>
              <Segmented
                label={t('body.sex')}
                value={draft.sex}
                onChange={(sex) => patch({ sex })}
                options={SEXES.map((s) => ({ value: s, label: t(`domain:sex.${s}`) }))}
              />
            </div>
            <div>
              <FieldLabel>{t('body.age')}</FieldLabel>
              <NumberStepper
                label={t('body.age')}
                value={draft.age}
                onChange={(age) => patch({ age: Math.round(age) })}
                min={14}
                max={100}
                unit={t('body.ageUnit')}
              />
            </div>
            <div>
              <FieldLabel>{t('body.height')}</FieldLabel>
              <NumberStepper
                label={t('body.height')}
                value={draft.heightCm}
                onChange={(heightCm) => patch({ heightCm: Math.round(heightCm) })}
                min={120}
                max={230}
                unit="cm"
              />
            </div>
            <div>
              <FieldLabel>{t('body.weight')}</FieldLabel>
              <NumberStepper
                label={t('body.weight')}
                value={draft.weightKg}
                onChange={(weightKg) => patch({ weightKg })}
                min={30}
                max={300}
                step={0.5}
                unit="kg"
              />
            </div>
          </div>
        </>
      )
    case 'job':
      return (
        <>
          <StepHeader title={t('job.title')} subtitle={t('job.subtitle')} />
          <JobPicker value={draft.job} onChange={(job) => patch({ job })} />
        </>
      )
    case 'availability':
      return (
        <>
          <StepHeader title={t('availability.title')} subtitle={t('availability.subtitle')} />
          <div className="flex flex-col gap-8">
            <div>
              <FieldLabel hint={t('availability.daysCount', { count: draft.weekdays.length })}>
                {t('availability.days')}
              </FieldLabel>
              <WeekdayPicker
                value={draft.weekdays}
                onChange={(weekdays: Weekday[]) => patch({ weekdays })}
              />
              {draft.weekdays.length >= 6 && (
                <p className="mt-2 text-xs text-muted-foreground">{t('availability.maxDays')}</p>
              )}
            </div>
            <div>
              <FieldLabel>{t('availability.minutes')}</FieldLabel>
              <MinutesSlider
                value={draft.minutesPerSession}
                onChange={(minutesPerSession) => patch({ minutesPerSession })}
              />
            </div>
          </div>
        </>
      )
    case 'equipment':
      return (
        <>
          <StepHeader title={t('equipment.title')} subtitle={t('equipment.subtitle')} />
          <EquipmentPicker value={draft.equipment} onChange={(equipment) => patch({ equipment })} />
        </>
      )
    case 'consent':
      return (
        <>
          <StepHeader title={t('consent.title')} subtitle={t('consent.subtitle')} />
          <div className="surface grain flex flex-col gap-3 p-5 text-sm">
            <ShieldCheck className="size-8 text-success" aria-hidden />
            <p>{t('consent.what')}</p>
            <p className="text-muted-foreground">{t('consent.why')}</p>
            <p className="text-muted-foreground">{t('consent.where')}</p>
            <Link
              to="/legal/privacidad"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t('consent.readPrivacy')}
            </Link>
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-4 rounded-3xl border border-border/70 bg-card p-4">
            <Checkbox
              className="mt-0.5"
              checked={healthConsent}
              onCheckedChange={(v) => setHealthConsent(v === true)}
            />
            <span className="text-sm leading-relaxed">{t('consent.checkbox')}</span>
          </label>
          {!healthConsent && (
            <p className="mt-3 text-sm text-muted-foreground">{t('consent.skipHint')}</p>
          )}
        </>
      )
    case 'injuries':
      return (
        <>
          <StepHeader title={t('injuries.title')} subtitle={t('injuries.subtitle')} />
          <InjuryPicker value={draft.injuries} onChange={(injuries) => patch({ injuries })} />
          <div className="mt-6 flex gap-3 rounded-3xl bg-warning/12 p-4 text-sm">
            <TriangleAlert className="size-5 shrink-0 text-warning" aria-hidden />
            <p>{t('common:consultProfessional')}</p>
          </div>
        </>
      )
    case 'summary':
      return (
        <>
          <StepHeader title={t('summary.title')} subtitle={t('summary.subtitle')} />
          <Summary healthConsent={healthConsent} />
          <label className="mt-5 flex cursor-pointer items-start gap-4 rounded-3xl border border-border/70 bg-card p-4">
            <Checkbox
              className="mt-0.5"
              checked={termsAccepted}
              onCheckedChange={(v) => setTermsAccepted(v === true)}
            />
            <span className="text-sm leading-relaxed">
              <Trans
                t={t}
                i18nKey="summary.terms"
                components={{
                  terms: (
                    <Link to="/legal/terminos" className="font-semibold text-primary underline" />
                  ),
                  privacy: (
                    <Link to="/legal/privacidad" className="font-semibold text-primary underline" />
                  ),
                }}
              />
            </span>
          </label>
        </>
      )
    default:
      return null
  }
}

function Summary({ healthConsent }: { healthConsent: boolean }) {
  const { t } = useTranslation(['onboarding', 'domain', 'common'])
  const { draft } = useOnboarding()
  const medium = t('common:weekdays.medium', { returnObjects: true })
  const rows: [string, string][] = [
    [t('summary.goal'), draft.goal ? t(`domain:goals.${draft.goal}`) : '—'],
    [t('summary.level'), draft.level ? t(`domain:levels.${draft.level}`) : '—'],
    [
      t('summary.body'),
      t('summary.bodyValue', {
        age: draft.age,
        height: draft.heightCm,
        weight: String(draft.weightKg).replace('.', ','),
      }),
    ],
    [t('summary.job'), draft.job ? t(`domain:jobs.${draft.job}`) : '—'],
    [
      t('summary.schedule'),
      t('summary.scheduleValue', {
        days: draft.weekdays.map((d) => medium[d]).join(' · '),
        minutes: draft.minutesPerSession,
      }),
    ],
    [t('summary.equipment'), t('summary.equipmentCount', { count: draft.equipment.length })],
    [
      t('summary.health'),
      !healthConsent
        ? t('summary.noConsent')
        : draft.injuries.length === 0
          ? t('summary.noInjuries')
          : draft.injuries
              .map(
                (i) =>
                  `${t(`domain:injuryZones.${i.zone}`)} (${t(`domain:severities.${i.severity}`).toLowerCase()})`,
              )
              .join(', '),
    ],
  ]
  return (
    <dl className="surface divide-y divide-border/60 px-5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 py-3.5">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-right text-sm font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Welcome({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation('onboarding')
  const input = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const points = [
    { icon: Sparkles, text: t('welcome.points.adaptive') },
    { icon: ShieldCheck, text: t('welcome.points.private') },
    { icon: CloudOff, text: t('welcome.points.offline') },
  ]

  useEffect(() => {
    // Precarga el catálogo mientras el usuario lee.
    void loadCatalog()
  }, [])

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col overflow-hidden px-6 pt-safe pb-safe">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--surface-glow),transparent_65%)] opacity-90"
      />
      <div className="flex flex-1 flex-col justify-center gap-8 py-10">
        <motion.div
          initial={reduced ? false : { scale: 0.6, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          className="relative w-fit"
        >
          <div className="absolute inset-2 -z-10 animate-ember-pulse rounded-full" />
          <LogoMark className="size-20 drop-shadow-[0_8px_30px_var(--ember)]" />
        </motion.div>
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-display text-lg font-bold text-primary">Forja</p>
          <h1 className="mt-1 text-[2.75rem] leading-[0.95] font-extrabold text-balance">
            {t('welcome.title')}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{t('welcome.body')}</p>
        </motion.div>
        <ul className="flex flex-col gap-3">
          {points.map(({ icon: Icon, text }, i) => (
            <motion.li
              key={text}
              initial={reduced ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
              className="flex items-start gap-3"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="pt-1.5 text-sm">{text}</span>
            </motion.li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2 pb-4">
        <Button size="xl" className="w-full" onClick={onStart}>
          {t('welcome.start')}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => input.current?.click()}>
          {t('welcome.import')}
        </Button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              await importAll(await file.text())
              toast.success(t('welcome.importDone'))
              void navigate('/hoy', { replace: true })
            } catch {
              toast.error(t('welcome.importError'))
            }
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
