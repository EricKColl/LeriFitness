import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react'
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Cloud,
  Cpu,
  Eraser,
  SendHorizontal,
  SlidersHorizontal,
  Square,
  X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { exerciseName, useCatalog } from '@/data/catalog'
import { cn } from '@/shared/lib/utils'
import { usePrefs } from '@/shared/stores/prefs'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/fields'
import { Progress } from '@/shared/ui/progress'
import { Switch } from '@/shared/ui/switch'
import { Textarea } from '@/shared/ui/textarea'

import { hasDownloadedModels } from './device'
import {
  engineHint,
  initEngine,
  pickEngine,
  prepareModel,
  removeAllModels,
  removeModel,
  type CloudState,
} from './engine'
import { MagicErickAvatar } from './launcher'
import { closeMagicErick, useAssistant, type ChatMessage, type Source } from './store'
import { useChat, useContextInput } from './use-chat'

const SOURCE_ICONS: Record<Source, typeof BookOpen> = {
  glossary: BookOpen,
  local: Cpu,
  remote: Cloud,
}

/** Pantallas anchas: ventana flotante. Estrechas: hoja casi a pantalla completa. */
const WIDE = '(min-width: 640px)'
const subscribeWide = (onChange: () => void) => {
  const media = window.matchMedia(WIDE)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
const useIsWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches)

/**
 * Zona visible real en el móvil: al abrir el teclado se encoge y la ventana se ajusta a ella para
 * que el campo de texto no quede debajo del teclado.
 */
function useVisualViewport(enabled: boolean) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const viewport = window.visualViewport
      if (!enabled || !viewport) return () => {}
      viewport.addEventListener('resize', onChange)
      viewport.addEventListener('scroll', onChange)
      return () => {
        viewport.removeEventListener('resize', onChange)
        viewport.removeEventListener('scroll', onChange)
      }
    },
    [enabled],
  )
  const snapshot = useSyncExternalStore(subscribe, () => {
    const viewport = window.visualViewport
    return enabled && viewport ? `${viewport.offsetTop} ${viewport.height}` : ''
  })
  if (!snapshot) return null
  const [top = 0, height = 0] = snapshot.split(' ').map(Number)
  return { top, height }
}

/** Hueco superior en el móvil: se ve la app detrás y se entiende que es una ventana. */
const TOP_GAP = 'calc(env(safe-area-inset-top) + 2.5rem)'

export function MagicErickPanel() {
  const open = useAssistant((s) => s.open)
  const wide = useIsWide()
  const reduced = useReducedMotion()
  const viewport = useVisualViewport(open && !wide)
  const panel = useRef<HTMLElement>(null)

  useEffect(() => void initEngine(), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMagicErick()
    }
    window.addEventListener('keydown', onKey)
    // En el escritorio se escribe directamente; en el móvil no se abre el teclado sin pedirlo.
    if (wide) panel.current?.querySelector('textarea')?.focus()
    else panel.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, wide])

  // En el móvil, la app de detrás no se desplaza mientras la ventana está abierta.
  useEffect(() => {
    if (!open || wide) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [open, wide])

  const mobileBox: CSSProperties | undefined =
    !wide && viewport
      ? {
          top: `calc(${viewport.top}px + ${TOP_GAP})`,
          height: `calc(${viewport.height}px - ${TOP_GAP})`,
          bottom: 'auto',
        }
      : undefined

  return (
    <AnimatePresence>
      {open && !wide && (
        <motion.div
          key="overlay"
          aria-hidden
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeMagicErick}
        />
      )}
      {open && (
        <motion.section
          key="panel"
          ref={panel}
          role="dialog"
          aria-modal={!wide}
          aria-labelledby="magicerick-title"
          tabIndex={-1}
          initial={
            reduced ? { opacity: 0 } : wide ? { opacity: 0, y: 24, scale: 0.96 } : { y: '100%' }
          }
          animate={reduced ? { opacity: 1 } : wide ? { opacity: 1, y: 0, scale: 1 } : { y: 0 }}
          exit={
            reduced ? { opacity: 0 } : wide ? { opacity: 0, y: 24, scale: 0.96 } : { y: '100%' }
          }
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          style={mobileBox}
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden border border-border/70 bg-background shadow-[0_24px_80px_-24px_rgb(0_0_0/0.6)] outline-hidden',
            wide
              ? 'right-6 bottom-6 h-[min(40rem,calc(100dvh-3rem))] w-[25rem] origin-bottom-right rounded-3xl'
              : 'inset-x-0 top-[calc(env(safe-area-inset-top)+2.5rem)] bottom-0 mx-auto max-w-lg rounded-t-3xl border-b-0',
          )}
        >
          <Chat wide={wide} />
        </motion.section>
      )}
    </AnimatePresence>
  )
}

function Chat({ wide }: { wide: boolean }) {
  const { t } = useTranslation('assistant')
  const [view, setView] = useState<'chat' | 'settings'>('chat')
  const exerciseId = useAssistant((s) => s.exerciseId)
  const context = useContextInput(exerciseId)
  const chat = useChat(context)
  const { messages, local, progress, clear } = useAssistant()
  const source = pickEngine(local, chat.cloud)
  const preparing = local === 'loading' || local === 'downloading'

  const status =
    local === 'checking'
      ? t('status.checking')
      : source === 'glossary' && preparing
        ? t('status.preparing', { percent: Math.round(progress * 100) })
        : t(`status.${source}`)

  return (
    <>
      <header className="flex items-center gap-2 border-b border-border/60 py-2.5 pr-2 pl-4">
        {view === 'settings' ? (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2"
            aria-label={t('back')}
            onClick={() => setView('chat')}
          >
            <ArrowLeft className="size-5" />
          </Button>
        ) : (
          <MagicErickAvatar className="size-10" />
        )}
        <div className="min-w-0 flex-1 pl-1">
          <h2
            id="magicerick-title"
            className="truncate font-display text-lg leading-tight font-extrabold"
          >
            {view === 'settings' ? t('settings') : t('name')}
          </h2>
          {view === 'chat' && (
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <span
                aria-hidden
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  source === 'local' && 'bg-success',
                  source === 'remote' && 'bg-steel',
                  source === 'glossary' && 'bg-muted-foreground/60',
                )}
              />
              {status}
            </p>
          )}
        </div>
        {view === 'chat' && messages.length > 0 && (
          <Button variant="ghost" size="icon" aria-label={t('clear')} onClick={clear}>
            <Eraser className="size-5" />
          </Button>
        )}
        {view === 'chat' && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('settings')}
            onClick={() => setView('settings')}
          >
            <SlidersHorizontal className="size-5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label={t('close')} onClick={closeMagicErick}>
          {wide ? <X className="size-5" /> : <ChevronDown className="size-6" />}
        </Button>
      </header>
      {view === 'settings' ? (
        <Settings cloud={chat.cloud} />
      ) : (
        <Conversation chat={chat} ready={!!context} onOptions={() => setView('settings')} />
      )}
    </>
  )
}

function Conversation({
  chat,
  ready,
  onOptions,
}: {
  chat: ReturnType<typeof useChat>
  ready: boolean
  onOptions: () => void
}) {
  const { t } = useTranslation('assistant')
  const catalog = useCatalog()
  const { messages, busy, local, exerciseId, set } = useAssistant()
  const [question, setQuestion] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const hint = engineHint(local, chat.cloud)

  useEffect(() => {
    const el = scroller.current
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = (text: string) => {
    if (!text.trim() || busy || !ready) return
    setQuestion('')
    void chat.ask(text)
  }

  const suggestions = [
    ...(exerciseId
      ? [t('exerciseSuggestion', { exercise: exerciseName(catalog, exerciseId).toLowerCase() })]
      : []),
    ...t('suggestions', { returnObjects: true }),
  ]

  return (
    <>
      <div
        ref={scroller}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
        aria-live="polite"
      >
        <div className="flex flex-col gap-4">
          <Bubble message={{ id: 'greeting', role: 'assistant', text: t('greeting') }} />
          <p className="-mt-2 pl-10 text-[0.7rem] leading-snug text-muted-foreground">
            {t('disclaimer')}
          </p>
          {hint && <HintCard hint={hint} onOptions={onOptions} />}
          {messages.length === 0 && (
            <div className="flex flex-col gap-2 pl-10">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {t('suggestionsTitle')}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Chip
                    key={s}
                    selected={false}
                    disabled={!ready}
                    onClick={() => send(s)}
                    className="h-auto max-w-full shrink py-2 text-left whitespace-normal"
                  >
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}
        </div>
      </div>

      <form
        className="border-t border-border/60 bg-background px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
        onSubmit={(e) => {
          e.preventDefault()
          send(question)
        }}
      >
        {exerciseId && (
          <div className="mb-2 flex">
            <span className="flex max-w-full items-center gap-1 rounded-full bg-steel-soft py-1 pr-1 pl-3 text-xs font-semibold text-steel">
              <span className="truncate">
                {t('about', { exercise: exerciseName(catalog, exerciseId) })}
              </span>
              <button
                type="button"
                aria-label={t('aboutClear')}
                onClick={() => set({ exerciseId: null })}
                className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-steel/15"
              >
                <X className="size-3.5" />
              </button>
            </span>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-3xl border border-border bg-card p-1.5">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(question)
              }
            }}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            maxLength={500}
            rows={1}
            className="max-h-32 min-h-10 resize-none border-0 bg-transparent px-3 py-2 focus-visible:ring-0"
          />
          {busy ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="shrink-0 rounded-full"
              aria-label={t('stop')}
              onClick={chat.stop}
            >
              <Square className="size-4 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              className="shrink-0 rounded-full"
              aria-label={t('send')}
              disabled={!question.trim() || !ready}
            >
              <SendHorizontal className="size-5" />
            </Button>
          )}
        </div>
      </form>
    </>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  const { t } = useTranslation('assistant')
  const user = message.role === 'user'
  const Icon = message.source ? SOURCE_ICONS[message.source] : null
  if (user)
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-primary-foreground">
          {message.text}
        </div>
      </div>
    )
  return (
    <div className="flex items-start gap-2">
      <MagicErickAvatar className="mt-0.5 size-8" />
      <div className="flex max-w-[85%] min-w-0 flex-col items-start gap-1">
        <span className="px-1 text-xs font-bold">{t('name')}</span>
        <div className="rounded-3xl rounded-tl-lg border border-border/60 bg-card px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          {message.pending && !message.text ? (
            <span className="inline-flex gap-1 py-1" role="status" aria-label="…">
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
        {Icon && message.source && (
          <span className="flex items-center gap-1 px-1 text-[0.7rem] text-muted-foreground">
            <Icon className="size-3" />
            {t(`sources.${message.source}`)}
          </span>
        )}
      </div>
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

function HintCard({
  hint,
  onOptions,
}: {
  hint: NonNullable<ReturnType<typeof engineHint>>
  onOptions: () => void
}) {
  const { t } = useTranslation('assistant')
  const navigate = useNavigate()
  const { local, progress } = useAssistant()
  const setPrefs = usePrefs((s) => s.set)

  if (hint === 'progress')
    return (
      <div className="surface ml-10 p-3">
        <p className="text-sm font-semibold">
          {t(local === 'loading' ? 'engine.loading' : 'engine.downloading', {
            percent: Math.round(progress * 100),
          })}
        </p>
        <Progress className="mt-2" value={progress * 100} />
      </div>
    )

  const signIn = () => {
    closeMagicErick()
    void navigate('/perfil/cuenta')
  }
  const content = {
    enableCloud: {
      title: t('hint.enableCloudTitle'),
      body: t('hint.enableCloud'),
      action: { label: t('engine.cloudEnable'), run: () => setPrefs({ assistantCloud: true }) },
    },
    signIn: {
      title: t('hint.signInTitle'),
      body: t('hint.signIn'),
      action: { label: t('engine.signIn'), run: signIn },
    },
    download: {
      title: t('hint.downloadTitle'),
      body: t('hint.download'),
      action: null,
    },
  }[hint]

  return (
    <div className="surface-glow ml-10 rounded-3xl border border-border/70 p-4">
      <p className="font-semibold">{content.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{content.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {content.action && (
          <Button size="sm" onClick={content.action.run}>
            {content.action.label}
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onOptions}>
          {t('hint.options')}
        </Button>
      </div>
    </div>
  )
}

function Settings({ cloud }: { cloud: CloudState }) {
  const { t } = useTranslation('assistant')
  const navigate = useNavigate()
  const { local, progress } = useAssistant()
  const { assistantCloud, set: setPrefs } = usePrefs()
  const [mobileModels, setMobileModels] = useState(false)

  useEffect(() => {
    if (local === 'mobile') void hasDownloadedModels().then(setMobileModels)
  }, [local])

  const signIn = () => {
    closeMagicErick()
    void navigate('/perfil/cuenta')
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
      <section className="surface p-4">
        <div className="flex items-center gap-3">
          <Cloud className="size-5 shrink-0 text-steel" />
          <h3 className="flex-1 font-semibold">{t('engine.cloudTitle')}</h3>
          {(cloud === 'on' || cloud === 'off') && (
            <Switch
              checked={assistantCloud}
              onCheckedChange={(v) => setPrefs({ assistantCloud: v })}
              aria-label={t('engine.cloudSwitch')}
            />
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t('engine.cloud')}</p>
        {cloud === 'signedOut' && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={signIn}>
              {t('engine.signIn')}
            </Button>
            <span className="text-xs text-muted-foreground">{t('engine.cloudSignedOut')}</span>
          </div>
        )}
        {cloud === 'unconfigured' && (
          <p className="mt-2 text-xs text-muted-foreground">{t('engine.cloudUnconfigured')}</p>
        )}
      </section>

      <section className="surface p-4">
        <div className="flex items-center gap-3">
          <Cpu className="size-5 shrink-0 text-success" />
          <h3 className="flex-1 font-semibold">{t('engine.localTitle')}</h3>
        </div>
        <LocalOptions
          local={local}
          progress={progress}
          mobileModels={mobileModels}
          onMobileDelete={() =>
            void removeAllModels().then(() => {
              setMobileModels(false)
              toast(t('engine.mobileDeleted'))
            })
          }
        />
      </section>

      <section className="surface p-4">
        <div className="flex items-center gap-3">
          <BookOpen className="size-5 shrink-0 text-muted-foreground" />
          <h3 className="flex-1 font-semibold">{t('engine.glossaryTitle')}</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t('engine.glossary')}</p>
      </section>
    </div>
  )
}

function LocalOptions({
  local,
  progress,
  mobileModels,
  onMobileDelete,
}: {
  local: ReturnType<typeof useAssistant.getState>['local']
  progress: number
  mobileModels: boolean
  onMobileDelete: () => void
}) {
  const { t } = useTranslation('assistant')
  const assistantModel = usePrefs((s) => s.assistantModel)
  const percent = Math.round(progress * 100)
  const remove = () => void removeModel().then(() => toast(t('engine.removed')))

  switch (local) {
    case 'checking':
      return <p className="mt-2 text-sm text-muted-foreground">{t('status.checking')}</p>
    case 'mobile':
      return (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t('engine.mobile')}</p>
          {mobileModels && (
            <div className="mt-3 rounded-2xl bg-secondary/60 p-3">
              <p className="text-sm">{t('engine.mobileModels')}</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={onMobileDelete}>
                {t('engine.mobileDelete')}
              </Button>
            </div>
          )}
        </>
      )
    case 'unsupported':
      return <p className="mt-2 text-sm text-muted-foreground">{t('engine.unsupported')}</p>
    case 'downloading':
    case 'loading':
      return (
        <div className="mt-2">
          <p className="text-sm font-semibold">
            {t(local === 'loading' ? 'engine.loading' : 'engine.downloading', { percent })}
          </p>
          <Progress className="mt-2" value={percent} />
        </div>
      )
    case 'ready':
      return (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-muted-foreground">{t('engine.ready')}</p>
          <Button size="sm" variant="ghost" onClick={remove}>
            {t('engine.remove')}
          </Button>
        </div>
      )
    case 'error':
      return (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t('engine.error')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void prepareModel(assistantModel ?? 'light')}
            >
              {t('engine.retry')}
            </Button>
            {assistantModel && (
              <Button size="sm" variant="ghost" onClick={remove}>
                {t('engine.remove')}
              </Button>
            )}
          </div>
        </>
      )
    case 'notDownloaded':
      return (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t('engine.notDownloaded')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void prepareModel('quality')}>
              {t('engine.downloadQuality')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void prepareModel('light')}>
              {t('engine.downloadLight')}
            </Button>
          </div>
        </>
      )
  }
}
