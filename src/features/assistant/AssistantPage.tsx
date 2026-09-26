import { useEffect, useRef, useState } from 'react'
import { BookOpen, Cloud, Cpu, Eraser, SendHorizontal, Sparkles, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { exerciseName, useCatalog } from '@/data/catalog'
import { useActivePlan, useHealthConsent, useProfile } from '@/data/hooks'
import { useDynamicT, useReasonText } from '@/i18n/reason'
import { cn } from '@/shared/lib/utils'
import { usePrefs } from '@/shared/stores/prefs'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/fields'
import { Page } from '@/shared/ui/page'
import { Progress } from '@/shared/ui/progress'
import { Textarea } from '@/shared/ui/textarea'

import { buildContext, planReasonsFor, SYSTEM_PROMPT, type ContextInput } from './context'
import { KNOWLEDGE, mentionsHealth, searchKnowledge } from './knowledge'
import {
  deleteModel,
  detectGpu,
  generate,
  isModelCached,
  loadedModel,
  loadModel,
  modelId,
  unloadModel,
  type LocalModelSize,
} from './local-llm'
import { askRemote, RemoteError, remoteConfigured } from './remote'
import { useAssistant, type ChatMessage, type Source } from './store'

const SOURCE_ICONS: Record<Source, typeof BookOpen> = {
  glossary: BookOpen,
  local: Cpu,
  remote: Cloud,
}

/** Contexto del plan traducido (se filtra según el destino en `buildContext`). */
function useContextInput(exerciseId: string | null): ContextInput | null {
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

export function AssistantPage() {
  const { t } = useTranslation('assistant')
  const catalog = useCatalog()
  const [params] = useSearchParams()
  const exerciseId = params.get('ejercicio')
  const context = useContextInput(exerciseId)
  const { messages, local, busy, push, update, clear, set } = useAssistant()
  const { assistantModel, assistantCloud, set: setPrefs } = usePrefs()
  const [question, setQuestion] = useState('')
  const [f16, setF16] = useState(true)
  const abort = useRef<AbortController | null>(null)
  const bottom = useRef<HTMLDivElement>(null)

  // Estado del modelo local: sin WebGPU → glosario; con un modelo ya descargado → se carga solo.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const gpu = await detectGpu()
      if (cancelled) return
      setF16(gpu.f16)
      if (!gpu.webgpu) return set({ local: 'unsupported' })
      if (assistantModel) {
        const id = modelId(assistantModel, gpu.f16)
        if (loadedModel() === id) return set({ local: 'ready' })
        if (await isModelCached(id)) return void download(assistantModel, gpu.f16)
      }
      set({ local: 'notDownloaded' })
    })()
    return () => {
      cancelled = true
    }
    // Solo al entrar en la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  async function download(size: LocalModelSize, useF16 = f16) {
    set({ local: 'downloading', progress: 0, progressText: '' })
    try {
      await loadModel(modelId(size, useF16), (progress, text) =>
        set({ progress, progressText: text }),
      )
      setPrefs({ assistantModel: size })
      set({ local: 'ready' })
    } catch {
      set({ local: 'error' })
    }
  }

  async function remove() {
    if (!assistantModel) return
    const id = modelId(assistantModel, f16)
    await unloadModel()
    await deleteModel(id)
    setPrefs({ assistantModel: null })
    set({ local: 'notDownloaded' })
    toast(t('engine.removed'))
  }

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
    if (!q || busy || !context) return
    setQuestion('')
    const history = messages.filter((m) => !m.pending).slice(-6)
    push({ id: `u-${Date.now()}`, role: 'user', text: q })
    const id = `a-${Date.now()}`
    push({ id, role: 'assistant', text: '', pending: true })
    set({ busy: true })
    const notice = mentionsHealth(q) ? `\n\n${t('healthNotice')}` : ''
    const finish = (answer: string, source: Source) => {
      update(id, { text: answer + notice, source, pending: false })
      set({ busy: false })
    }

    if (local === 'ready') {
      abort.current = new AbortController()
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
          abort.current.signal,
        )) {
          answer += chunk
          update(id, { text: answer, source: 'local' })
        }
        return finish(answer.trim(), 'local')
      } catch {
        return finish(glossaryAnswer(q), 'glossary')
      }
    }

    if (assistantCloud && remoteConfigured()) {
      try {
        const result = await askRemote(
          q,
          buildContext(context, 'remote', q),
          history.map((m) => ({ role: m.role, text: m.text })),
        )
        finish(result.answer, 'remote')
        if (result.remaining <= 3) toast(t('engine.remaining', { count: result.remaining }))
        return
      } catch (error) {
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

  const suggestions = [
    ...(exerciseId
      ? [t('exerciseSuggestion', { exercise: exerciseName(catalog, exerciseId).toLowerCase() })]
      : []),
    ...t('suggestions', { returnObjects: true }),
  ]

  return (
    <Page
      eyebrow={t('eyebrow')}
      title={t('title')}
      back
      actions={
        messages.length > 0 && (
          <Button variant="ghost" size="icon" aria-label={t('clear')} onClick={clear}>
            <Eraser className="size-5" />
          </Button>
        )
      }
      className="flex min-h-[calc(100dvh-6rem)] flex-col"
    >
      <EnginePanel
        onDownload={(size) => void download(size)}
        onRemove={() => void remove()}
        cloud={assistantCloud}
        onCloud={(v) => setPrefs({ assistantCloud: v })}
      />

      <div className="mt-4 flex flex-1 flex-col gap-3" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t('intro')}</p>
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {t('suggestionsTitle')}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Chip
                  key={s}
                  selected={false}
                  onClick={() => void ask(s)}
                  className="h-auto py-2 text-left whitespace-normal"
                >
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
        <div ref={bottom} />
      </div>

      <form
        className="sticky bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+5.25rem)] mt-4 flex items-end gap-2 rounded-3xl border border-border bg-card p-2 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault()
          void ask(question)
        }}
      >
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void ask(question)
            }
          }}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          maxLength={500}
          rows={1}
          className="max-h-32 min-h-11 resize-none border-0 bg-transparent py-2.5 focus-visible:ring-0"
        />
        {busy ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label={t('stop')}
            onClick={() => abort.current?.abort()}
          >
            <Square className="size-4 fill-current" />
          </Button>
        ) : (
          <Button type="submit" size="icon" aria-label={t('send')} disabled={!question.trim()}>
            <SendHorizontal className="size-5" />
          </Button>
        )}
      </form>
      <p className="mt-2 text-center text-[0.7rem] text-muted-foreground">{t('disclaimer')}</p>
    </Page>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  const { t } = useTranslation('assistant')
  const user = message.role === 'user'
  const Icon = message.source ? SOURCE_ICONS[message.source] : Sparkles
  return (
    <div className={cn('flex flex-col gap-1', user ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          user ? 'rounded-br-lg bg-primary text-primary-foreground' : 'rounded-bl-lg bg-card',
        )}
      >
        {message.pending && !message.text ? (
          <span className="inline-flex gap-1" aria-label="…">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
        ) : (
          <FormattedText text={message.text} />
        )}
      </div>
      {!user && message.source && (
        <span className="flex items-center gap-1 px-2 text-[0.7rem] text-muted-foreground">
          <Icon className="size-3" />
          {t(`sources.${message.source}`)}
        </span>
      )}
    </div>
  )
}

/** Negritas con **texto** (lo único que usan las respuestas); sin HTML arbitrario. */
function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

function EnginePanel({
  onDownload,
  onRemove,
  cloud,
  onCloud,
}: {
  onDownload: (size: LocalModelSize) => void
  onRemove: () => void
  cloud: boolean
  onCloud: (value: boolean) => void
}) {
  const { t } = useTranslation('assistant')
  const { local, progress } = useAssistant()
  const showCloud = remoteConfigured() && (local === 'unsupported' || local === 'error')
  if (local === 'checking')
    return <p className="text-sm text-muted-foreground">{t('engine.checking')}</p>
  return (
    <div className="surface flex flex-col gap-3 p-4">
      {local === 'ready' && (
        <div className="flex items-start gap-3">
          <Cpu className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="flex-1">
            <p className="font-semibold">{t('engine.readyTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('engine.ready')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            {t('engine.remove')}
          </Button>
        </div>
      )}
      {local === 'downloading' && (
        <div>
          <p className="text-sm font-semibold">
            {t('engine.downloading', { percent: Math.round(progress * 100) })}
          </p>
          <Progress className="mt-2" value={progress * 100} />
        </div>
      )}
      {(local === 'notDownloaded' || local === 'error') && (
        <div>
          <p className="font-semibold">{t('engine.notDownloadedTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {local === 'error' ? t('engine.error') : t('engine.notDownloaded')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onDownload('quality')}>
              {t('engine.downloadQuality')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onDownload('light')}>
              {t('engine.downloadLight')}
            </Button>
          </div>
        </div>
      )}
      {local === 'unsupported' && (
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 size-5 shrink-0 text-steel" />
          <div>
            <p className="font-semibold">{t('engine.unsupportedTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('engine.unsupported')}</p>
          </div>
        </div>
      )}
      {showCloud && (
        <div className="border-t border-border/70 pt-3">
          <p className="flex items-center gap-2 font-semibold">
            <Cloud className="size-4" />
            {t('engine.cloudTitle')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t('engine.cloud')}</p>
          <Button
            size="sm"
            variant={cloud ? 'outline' : 'secondary'}
            className="mt-2"
            onClick={() => onCloud(!cloud)}
          >
            {cloud ? t('engine.cloudDisable') : t('engine.cloudEnable')}
          </Button>
        </div>
      )}
    </div>
  )
}
