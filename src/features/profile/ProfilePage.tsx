import { useRef, useState, type ReactNode } from 'react'
import {
  ChevronRight,
  Download,
  FileText,
  HeartPulse,
  ImageDown,
  Scale,
  ShieldCheck,
  Trash2,
  Upload,
  UserPen,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import type { Profile } from '@/domain'
import { downloadExport, importAll, wipeAll } from '@/data/backup'
import { exerciseImage, useCatalog } from '@/data/catalog'
import { db } from '@/data/db'
import { useProfile } from '@/data/hooks'
import { regeneratePlan } from '@/data/plans'
import { hasConsent, recordConsent, revokeHealthConsent } from '@/data/profile'
import { cachedCount, cacheImages } from '@/shared/lib/image-cache'
import { cn } from '@/shared/lib/utils'
import { usePrefs } from '@/shared/stores/prefs'
import { useThemeStore, type ThemePreference } from '@/shared/stores/theme'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Segmented } from '@/shared/ui/fields'
import { GOAL_ICONS } from '@/shared/ui/icons'
import { Page, Section } from '@/shared/ui/page'
import { Progress } from '@/shared/ui/progress'
import { Switch } from '@/shared/ui/switch'

export function ProfilePage() {
  const profile = useProfile()
  if (!profile) return null
  return <ProfileView profile={profile} />
}

function ProfileView({ profile }: { profile: Profile }) {
  const { t } = useTranslation(['profile', 'domain', 'common'])
  const catalog = useCatalog()
  const GoalIcon = GOAL_ICONS[profile.goal]

  return (
    <Page title={t('title')}>
      <Link
        to="/perfil/editar"
        className="surface-glow flex items-center gap-4 rounded-3xl border border-border/70 p-4"
      >
        <span className="bg-ember-gradient grid size-14 place-items-center rounded-2xl text-primary-foreground">
          <GoalIcon className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold">{t(`domain:goals.${profile.goal}`)}</p>
          <p className="text-sm text-muted-foreground">
            {t('summary', {
              level: t(`domain:levels.${profile.level}`),
              days: profile.weekdays.length,
              minutes: profile.minutesPerSession,
            })}
          </p>
        </div>
        <UserPen className="size-5 text-muted-foreground" />
      </Link>

      <Preferences />
      <Offline urls={catalog.exercises.flatMap((e) => e.images.map(exerciseImage))} />
      <DataRights profile={profile} />

      <Section title={t('legal.title')}>
        <div className="surface divide-y divide-border/70 overflow-hidden">
          {(
            [
              ['privacy', 'privacidad', ShieldCheck],
              ['terms', 'terminos', FileText],
              ['health', 'salud', HeartPulse],
              ['licenses', 'licencias', Scale],
            ] as const
          ).map(([doc, slug, Icon]) => (
            <Link
              key={doc}
              to={`/legal/${slug}`}
              className="flex min-h-14 items-center gap-3 px-4 transition-colors hover:bg-accent/40"
            >
              <Icon className="size-5 text-muted-foreground" />
              <span className="flex-1 font-medium">{t(`legal.${doc}`)}</span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </Section>

      <Section title={t('about.title')}>
        <div className="text-sm text-muted-foreground">
          <p>{t('about.tagline')}</p>
          <p className="mt-2 tabular-nums">
            {t('about.version', { version: __APP_VERSION__ })} ·{' '}
            {t('about.catalog', { version: catalog.version })}
          </p>
        </div>
      </Section>
    </Page>
  )
}

function Row({ label, hint, control }: { label: ReactNode; hint?: ReactNode; control: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {control}
    </div>
  )
}

function Preferences() {
  const { t } = useTranslation(['profile', 'common'])
  const prefs = usePrefs()
  const { preference, setPreference } = useThemeStore()
  const toggles = ['sound', 'vibration', 'keepAwake'] as const
  return (
    <Section title={t('prefs.title')}>
      <div className="surface divide-y divide-border/70">
        <div className="px-4 py-3">
          <p className="mb-2 font-medium">{t('prefs.theme')}</p>
          <Segmented<ThemePreference>
            label={t('prefs.theme')}
            value={preference}
            onChange={setPreference}
            size="sm"
            options={(['dark', 'light', 'system'] as const).map((v) => ({
              value: v,
              label: t(`common:theme.${v}`),
            }))}
          />
        </div>
        {toggles.map((key) => (
          <Row
            key={key}
            label={<label htmlFor={`pref-${key}`}>{t(`prefs.${key}`)}</label>}
            control={
              <Switch
                id={`pref-${key}`}
                checked={prefs[key]}
                onCheckedChange={(v) => prefs.set({ [key]: v })}
              />
            }
          />
        ))}
        <Row
          label={t('prefs.language')}
          hint={t('prefs.languageHint')}
          control={
            <span className="text-sm text-muted-foreground">{t('prefs.languageValue')}</span>
          }
        />
      </div>
    </Section>
  )
}

function Offline({ urls }: { urls: string[] }) {
  const { t } = useTranslation('profile')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [version, setVersion] = useState(0)
  const cached = useLiveQuery(() => cachedCount(urls), [version])
  const abort = useRef<AbortController | null>(null)
  if (!('caches' in window)) return null

  const download = async () => {
    abort.current = new AbortController()
    setProgress({ done: 0, total: urls.length })
    const failed = await cacheImages(
      urls,
      (done, total) => setProgress({ done, total }),
      abort.current.signal,
    )
    setProgress(null)
    setVersion((v) => v + 1)
    if (abort.current.signal.aborted) return
    if (failed > 0) toast.error(t('offline.failed', { count: failed }))
    else toast.success(t('offline.done'))
  }

  return (
    <Section title={t('offline.title')}>
      <div className="surface p-4">
        <p className="text-sm text-muted-foreground">{t('offline.body')}</p>
        {cached !== undefined && (
          <p className="mt-2 text-xs font-medium tabular-nums">
            {t('offline.status', { cached, total: urls.length })}
          </p>
        )}
        {progress ? (
          <div className="mt-3">
            <Progress value={(progress.done / progress.total) * 100} />
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="tabular-nums">{t('offline.downloading', progress)}</span>
              <Button variant="ghost" size="sm" onClick={() => abort.current?.abort()}>
                {t('offline.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          cached !== urls.length && (
            <Button variant="secondary" className="mt-3 w-full" onClick={() => void download()}>
              <ImageDown />
              {t('offline.download')}
            </Button>
          )
        )}
      </div>
    </Section>
  )
}

function DataRights({ profile }: { profile: Profile }) {
  const { t, i18n } = useTranslation(['profile', 'common'])
  const navigate = useNavigate()
  const catalog = useCatalog()
  const consent = useLiveQuery(() => db.consents.get('health'), [])
  const active = useLiveQuery(() => hasConsent('health'), [])
  const [dialog, setDialog] = useState<'wipe' | 'revoke' | 'grant' | 'import' | null>(null)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const confirm = async () => {
    const kind = dialog
    setDialog(null)
    if (kind === 'wipe') {
      await wipeAll()
      window.location.assign('/')
    } else if (kind === 'revoke') {
      const updated = await revokeHealthConsent()
      if (updated) await regeneratePlan({ ...profile, injuries: [] }, catalog)
      toast.success(t('data.revoked'))
    } else if (kind === 'grant') {
      await recordConsent('health', true)
      toast.success(t('data.granted'))
    } else if (kind === 'import' && pendingImport) {
      try {
        await importAll(pendingImport)
        toast.success(t('data.imported'))
        void navigate('/hoy')
      } catch {
        toast.error(t('data.importError'))
      }
      setPendingImport(null)
    }
  }

  const texts = {
    wipe: { title: t('data.wipeTitle'), body: t('data.wipeBody'), action: t('data.wipeConfirm') },
    revoke: { title: t('data.revokeTitle'), body: t('data.revokeBody'), action: t('data.revoke') },
    grant: { title: t('data.health'), body: t('data.grantBody'), action: t('data.grant') },
    import: { title: t('data.importTitle'), body: t('data.importBody'), action: t('data.import') },
  }
  const current = dialog ? texts[dialog] : null

  return (
    <Section title={t('data.title')}>
      <p className="mb-3 text-sm text-muted-foreground">{t('data.body')}</p>
      <div className="surface divide-y divide-border/70">
        <ActionRow
          icon={<Download />}
          label={t('data.export')}
          hint={t('data.exportHint')}
          onClick={() => void downloadExport().then(() => toast.success(t('data.exported')))}
        />
        <ActionRow
          icon={<Upload />}
          label={t('data.import')}
          hint={t('data.importHint')}
          onClick={() => fileRef.current?.click()}
        />
        <div className="px-4 py-3">
          <p className="flex items-center gap-2 font-medium">
            <HeartPulse className="size-5 text-muted-foreground" />
            {t('data.health')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {active && consent
              ? t('data.healthOn', { date: new Date(consent.at).toLocaleDateString(i18n.language) })
              : t('data.healthOff')}
          </p>
          <Button
            variant={active ? 'outline' : 'secondary'}
            size="sm"
            className="mt-2"
            onClick={() => setDialog(active ? 'revoke' : 'grant')}
          >
            {active ? t('data.revoke') : t('data.grant')}
          </Button>
        </div>
        <ActionRow
          icon={<Trash2 />}
          label={t('data.wipe')}
          hint={t('data.wipeHint')}
          destructive
          onClick={() => setDialog('wipe')}
        />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setPendingImport(await file.text())
          setDialog('import')
        }}
      />
      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{current?.title}</DialogTitle>
            <DialogDescription>{current?.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant={dialog === 'wipe' || dialog === 'revoke' ? 'destructive' : 'default'}
              onClick={() => void confirm()}
            >
              {current?.action}
            </Button>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t('common:actions.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  )
}

function ActionRow({
  icon,
  label,
  hint,
  onClick,
  destructive,
}: {
  icon: ReactNode
  label: string
  hint: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40 [&>svg]:size-5 [&>svg]:shrink-0"
    >
      <span
        className={cn('[&_svg]:size-5', destructive ? 'text-destructive' : 'text-muted-foreground')}
      >
        {icon}
      </span>
      <span className="flex-1">
        <span className={cn('block font-medium', destructive && 'text-destructive')}>{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}
