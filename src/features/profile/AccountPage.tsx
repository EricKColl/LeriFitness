import { useState } from 'react'
import { Check, Cloud, LogOut, RefreshCw, ShieldOff, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import {
  deleteAccount,
  sendCode,
  signOut,
  syncNow,
  useAccount,
  verifyCode,
} from '@/data/cloud/account'
import { getSyncState } from '@/data/cloud/sync'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { EmptyState, Page, Section } from '@/shared/ui/page'

import { usePlan } from '../premium/entitlements'

export function AccountPage() {
  const { t } = useTranslation('profile')
  const account = useAccount()
  return (
    <Page back="/perfil" title={t('account.title')} subtitle={t('account.subtitle')}>
      {account.status === 'disabled' ? (
        <EmptyState icon={<Cloud className="size-7" />} title={t('account.unavailable')} />
      ) : account.status === 'loading' ? null : account.status === 'signedIn' ? (
        <SignedIn email={account.email} />
      ) : (
        <SignIn />
      )}
      <WhatIsSynced />
    </Page>
  )
}

function WhatIsSynced() {
  const { t } = useTranslation('profile')
  return (
    <>
      <Section title={t('account.what')}>
        <ul className="surface flex flex-col gap-2 p-4 text-sm">
          {t('account.whatItems', { returnObjects: true }).map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              {item}
            </li>
          ))}
        </ul>
      </Section>
      <Section title={t('account.never')}>
        <ul className="surface flex flex-col gap-2 p-4 text-sm">
          {t('account.neverItems', { returnObjects: true }).map((item) => (
            <li key={item} className="flex gap-2">
              <ShieldOff className="mt-0.5 size-4 shrink-0 text-steel" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">{t('account.where')}</p>
      </Section>
    </>
  )
}

function SignIn() {
  const { t } = useTranslation('profile')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error(t('account.invalidEmail'))
    setBusy(true)
    try {
      await sendCode(email.trim())
      setSent(true)
    } catch {
      toast.error(t('account.sendError'))
    }
    setBusy(false)
  }

  const verify = async () => {
    setBusy(true)
    try {
      await verifyCode(email.trim(), code.trim())
      const result = await syncNow()
      if (result) toast.success(t('account.synced', result))
    } catch {
      toast.error(t('account.verifyError'))
    }
    setBusy(false)
  }

  return (
    <div className="surface flex flex-col gap-4 p-4">
      {!sent ? (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t('account.email')}
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              placeholder={t('account.emailPlaceholder')}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
            />
            <span>
              <Trans
                t={t}
                i18nKey="account.consent"
                components={{
                  privacy: (
                    <Link to="/legal/privacidad" className="font-semibold text-primary underline" />
                  ),
                }}
              />
            </span>
          </label>
          <Button disabled={!consent || !email || busy} onClick={() => void send()}>
            {t('account.sendCode')}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm">{t('account.codeSent', { email })}</p>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t('account.code')}
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center font-display text-2xl tracking-[0.4em]"
            />
          </label>
          <Button disabled={code.length < 6 || busy} onClick={() => void verify()}>
            {t('account.verify')}
          </Button>
          <Button variant="ghost" onClick={() => setSent(false)}>
            {t('account.changeEmail')}
          </Button>
        </>
      )}
    </div>
  )
}

function SignedIn({ email }: { email: string | null }) {
  const { t, i18n } = useTranslation(['profile', 'common', 'premium'])
  const state = useLiveQuery(getSyncState, [])
  const plan = usePlan()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      const result = await syncNow()
      if (result) toast.success(t('account.synced', result))
    } catch {
      toast.error(t('account.syncError'))
    }
    setBusy(false)
  }

  const remove = async () => {
    setConfirm(false)
    try {
      await deleteAccount()
      toast.success(t('account.deleted'))
    } catch {
      toast.error(t('account.deleteError'))
    }
  }

  return (
    <div className="surface flex flex-col gap-3 p-4">
      <p className="font-semibold">{t('account.signedInAs', { email })}</p>
      <p className="text-sm text-muted-foreground">
        {state?.lastSync
          ? t('account.lastSync', {
              date: new Date(state.lastSync).toLocaleString(i18n.language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }),
            })
          : t('account.neverSynced')}
      </p>
      <p className="text-sm text-muted-foreground">
        {t('account.plan', { plan: t(`premium:plans.${plan}`) })}
      </p>
      <Button onClick={() => void run()} disabled={busy}>
        <RefreshCw className={busy ? 'animate-spin' : undefined} />
        {t('account.syncNow')}
      </Button>
      <Button
        variant="outline"
        onClick={() => void signOut().then(() => toast(t('account.signedOut')))}
      >
        <LogOut />
        {t('account.signOut')}
      </Button>
      <Button variant="ghost" className="text-destructive" onClick={() => setConfirm(true)}>
        <Trash2 />
        {t('account.delete')}
      </Button>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('account.deleteTitle')}</DialogTitle>
            <DialogDescription>{t('account.deleteBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="destructive" onClick={() => void remove()}>
              {t('common:actions.delete')}
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('common:actions.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
