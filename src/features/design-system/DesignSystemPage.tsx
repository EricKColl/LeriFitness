import { Flame, Moon, Snowflake, Sun, Timer } from 'lucide-react'
import { motion } from 'motion/react'

import { BRAND } from '@/config/brand'
import { useThemeStore, type ThemePreference } from '@/shared/stores/theme'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Logo, LogoMark } from '@/shared/ui/logo'
import { Progress } from '@/shared/ui/progress'
import { Slider } from '@/shared/ui/slider'
import { Switch } from '@/shared/ui/switch'

const SWATCHES = [
  ['background', 'Carbón'],
  ['card', 'Superficie'],
  ['muted', 'Apagado'],
  ['primary', 'Ascua'],
  ['ember-hot', 'Ascua viva'],
  ['steel', 'Acero'],
  ['success', 'Éxito'],
  ['warning', 'Aviso'],
  ['destructive', 'Peligro'],
] as const

const HEAT = [0, 1, 2, 3, 4, 5] as const
const MEDALS = [
  ['bronze', 'Bronce'],
  ['silver', 'Plata'],
  ['gold', 'Oro'],
  ['damascus', 'Damasco'],
] as const

const THEMES: { value: ThemePreference; icon: typeof Sun }[] = [
  { value: 'dark', icon: Moon },
  { value: 'light', icon: Sun },
]

export function DesignSystemPage() {
  const { preference, setPreference } = useThemeStore()

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-5 py-10">
      <header className="flex items-center justify-between">
        <Logo />
        <div className="flex gap-1 rounded-2xl bg-secondary p-1">
          {THEMES.map(({ value, icon: Icon }) => (
            <Button
              key={value}
              size="icon-sm"
              variant={preference === value ? 'solid' : 'ghost'}
              onClick={() => setPreference(value)}
              aria-label={value}
            >
              <Icon />
            </Button>
          ))}
        </div>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="surface surface-glow grain overflow-hidden p-7"
      >
        <LogoMark className="mb-6 size-16" />
        <h1 className="text-5xl leading-[0.95] font-extrabold">
          Forja tu <span className="text-ember-gradient">mejor versión</span>
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">{BRAND.description}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button size="lg">
            <Flame /> Empezar a entrenar
          </Button>
          <Button size="lg" variant="outline">
            Ver ejercicios
          </Button>
        </div>
      </motion.section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Color</h2>
        <div className="grid grid-cols-3 gap-3">
          {SWATCHES.map(([token, name]) => (
            <div key={token} className="surface p-2">
              <div
                className="h-14 rounded-2xl border border-border/50"
                style={{ background: `var(--${token})` }}
              />
              <p className="mt-2 px-1 text-sm font-medium">{name}</p>
              <p className="px-1 text-xs text-muted-foreground">--{token}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Escala de calor del mapa muscular</p>
        <div className="flex overflow-hidden rounded-2xl">
          {HEAT.map((level) => (
            <div
              key={level}
              className="h-10 flex-1"
              style={{ background: `var(--heat-${level})` }}
            />
          ))}
        </div>
        <div className="flex gap-3">
          {MEDALS.map(([token, name]) => (
            <div key={token} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="size-12 rounded-full shadow-[inset_0_2px_0_oklch(1_0_0/0.4),inset_0_-3px_0_oklch(0_0_0/0.25)]"
                style={{ background: `var(--${token})` }}
              />
              <span className="text-xs text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">Tipografía</h2>
        <p className="font-display text-6xl font-extrabold tabular-nums">128,5 kg</p>
        <p className="font-display text-3xl font-bold">Bricolage Grotesque — títulos</p>
        <p className="text-lg">Inter — texto de interfaz, legible y neutro.</p>
        <p className="text-sm text-muted-foreground">
          Números tabulares para series, pesos y tiempos:{' '}
          <span className="tabular-nums">01:30</span>
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Componentes</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="steel">
            <Snowflake /> Descanso
          </Button>
          <Button variant="destructive">Borrar</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Hipertrofia</Badge>
          <Badge variant="secondary">Principiante</Badge>
          <Badge variant="outline">Mancuernas</Badge>
        </div>
        <div className="surface flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ds-weight">Peso corporal</Label>
            <Input id="ds-weight" inputMode="decimal" placeholder="75" />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Minutos por sesión</Label>
            <Slider defaultValue={[60]} min={20} max={120} step={5} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ds-sound">Sonido al terminar el descanso</Label>
            <Switch id="ds-sound" defaultChecked />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Timer className="size-4 text-steel" /> Descanso
              </span>
              <span className="text-muted-foreground tabular-nums">01:12</span>
            </div>
            <Progress value={62} />
          </div>
        </div>
      </section>
    </main>
  )
}
