import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { exerciseName, useCatalog } from '@/data/catalog'
import { useAccount } from '@/data/cloud/account'
import { useActivePlan, useHealthConsent, useProfile } from '@/data/hooks'
import { useDynamicT, useReasonText } from '@/i18n/reason'
import { usePrefs } from '@/shared/stores/prefs'

import { buildContext, planReasonsFor, SYSTEM_PROMPT, type ContextInput } from './context'
import { markLocalFailed, pickEngine, waitForLocal, type CloudState } from './engine'
import { KNOWLEDGE, mentionsHealth, searchKnowledge } from './knowledge'
import { generate } from './local-llm'
import { askRemote, RemoteError, remoteConfigured } from './remote'
import { useAssistant, type Source } from './store'

/** Contexto del plan traducido (se filtra según el destino en `buildContext`). */
export function useContextInput(exerciseId: string | null): ContextInput | null {
  const { t } = useTranslation(['domain', 'engine', 'plan'])
  const dt = useDynamicT()
  const catalog = useCatalog()
  const planRow = useActivePlan()
  const profile = useProfile()
  const consent = useHealthConsent()
  const reasonText = useReasonText((id) => exerciseName(catalog, id))
  if (!planRow || !profile || consent === undefined) return null
  const { plan } = planRow
  const exercise = exerciseId ? catalog.byId.get(exerciseId) : undefined
  return {
    goal: t(`domain:goals.${plan.goal}`),
    level: t(`domain:levels.${plan.level}`),
    split: dt(`engine:splitNames.${plan.split}`),
    week: t('plan:mesocycle', {
      index: plan.mesocycle.index,
      week: plan.mesocycle.week,
      length: plan.mesocycle.length,
    }),
    days: plan.days.map((d) => ({
      name: dt(`engine:days.${d.template}`),
      exercises: d.prescriptions.map(
        (p) => `${exerciseName(catalog, p.exerciseId)} ${p.sets}×${p.reps.min}-${p.reps.max}`,
      ),
    })),
    reasons: [...planRow.adaptation, ...plan.reasons, ...plan.warnings].map((r) => ({
      key: r.key,
      text: reasonText(r),
    })),
    exercise: exercise && {
      name: exerciseName(catalog, exercise.id),
      steps: catalog.content[exercise.id]?.steps ?? [],
      muscles: exercise.primaryMuscles.map((m) => t(`domain:muscles.${m}`)).join(', '),
    },
    healthConsent: consent,
  }
}

export function useCloudState(): CloudState {
  const account = useAccount()
  const enabled = usePrefs((s) => s.assistantCloud)
  if (!remoteConfigured() || account.status === 'disabled') return 'unconfigured'
  if (account.status !== 'signedIn') return 'signedOut'
  return enabled ? 'on' : 'off'
}

/** Conversación con MagicErick: elige quién responde y cae a la siguiente vía si algo falla. */
export function useChat(context: ContextInput | null) {
  const { t } = useTranslation('assistant')
  const cloud = useCloudState()
  const abort = useRef<AbortController | null>(null)

  function glossaryAnswer(q: string) {
    const found = searchKnowledge(q)
    const topics = (list: { title: string }[]) => list.map((k) => k.title.toLowerCase()).join(', ')
    const [first, ...rest] = found
    if (!first) return t('glossaryNoMatch', { topics: topics(KNOWLEDGE.slice(0, 5)) })
    const more = rest.length
      ? `\n\n${t('glossaryMore', { topics: topics(rest.map((r) => r.entry)) })}`
      : ''
    // Además de la explicación general, las razones concretas del motor para esta semana.
    const mine = context ? planReasonsFor(first.entry.reasons ?? [], context) : []
    const plan = mine.length
      ? `\n\n**${t('inYourPlan')}**\n${mine.map((r) => `• ${r}`).join('\n')}`
      : ''
    return `**${first.entry.title}**\n${first.entry.body}${plan}${more}`
  }

  async function ask(text: string) {
    const q = text.trim()
    const { busy, messages, push, update, remove, set } = useAssistant.getState()
    if (!q || busy || !context) return
    const history = messages.filter((m) => !m.pending).slice(-6)
    push({ id: `u-${Date.now()}`, role: 'user', text: q })
    const id = `a-${Date.now()}`
    push({ id, role: 'assistant', text: '', pending: true })
    set({ busy: true })
    const controller = new AbortController()
    abort.current = controller
    const notice = mentionsHealth(q) ? `\n\n${t('healthNotice')}` : ''
    const finish = (answer: string, source: Source) => {
      update(id, { text: answer + notice, source, pending: false })
      set({ busy: false })
    }
    const stopped = () => {
      if (!controller.signal.aborted) return false
      remove(id)
      set({ busy: false })
      return true
    }

    // Si el modelo del dispositivo se está cargando (ya descargado), se espera a que esté listo.
    if (cloud !== 'on') await waitForLocal()?.catch(() => {})
    if (stopped()) return

    if (pickEngine(useAssistant.getState().local, cloud) === 'local') {
      let answer = ''
      try {
        for await (const chunk of generate(
          [
            {
              role: 'system',
              content: `${SYSTEM_PROMPT}\n\nContexto:\n${buildContext(context, 'local', q)}`,
            },
            ...history.map((m) => ({ role: m.role, content: m.text })),
            { role: 'user', content: q },
          ],
          controller.signal,
        )) {
          answer += chunk
          update(id, { text: answer, source: 'local' })
        }
        if (controller.signal.aborted && !answer.trim()) return void stopped()
        return finish(answer.trim(), 'local')
      } catch {
        // Se colgó o se quedó sin memoria: no se vuelve a usar en este dispositivo.
        markLocalFailed()
        update(id, { text: '', source: undefined })
        toast(t('engine.localFailed'))
      }
    }

    if (cloud === 'on') {
      try {
        const result = await askRemote(
          q,
          buildContext(context, 'remote', q),
          history.map((m) => ({ role: m.role, text: m.text })),
          controller.signal,
        )
        finish(result.answer, 'remote')
        if (result.remaining <= 3) toast(t('engine.remaining', { count: result.remaining }))
        return
      } catch (error) {
        if (stopped()) return
        const reason = error instanceof RemoteError ? error.reason : 'unavailable'
        toast(
          reason === 'signedOut'
            ? t('engine.cloudSignIn')
            : reason === 'quota'
              ? t('engine.cloudQuota')
              : t('engine.cloudUnavailable'),
        )
      }
    }
    finish(glossaryAnswer(q), 'glossary')
  }

  return { ask, stop: () => abort.current?.abort(), cloud }
}
