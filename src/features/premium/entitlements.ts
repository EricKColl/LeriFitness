import { useEffect, useState } from 'react'

import { fetchPlan, useAccount } from '@/data/cloud/account'

import { canUse, type Feature, type Plan } from './features'

let cached: { email: string | null; plan: Plan } | null = null

/** Plan de la persona: «free» sin cuenta; con cuenta, el que diga el servidor. */
export function usePlan(): Plan {
  const account = useAccount()
  const email = account.status === 'signedIn' ? account.email : null
  const [plan, setPlan] = useState<Plan>(cached?.email === email ? cached.plan : 'free')
  useEffect(() => {
    if (!email) return
    let cancelled = false
    void fetchPlan()
      .then((p) => {
        cached = { email, plan: p }
        if (!cancelled) setPlan(p)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [email])
  return email ? plan : 'free'
}

export function useFeature(feature: Feature) {
  return canUse(feature, usePlan())
}
