# Prompt de continuación — Forja (repo LeriFitness)

Copia todo lo que hay debajo de la línea y pégalo como primer mensaje en Claude Code en la nube,
con el repositorio `https://github.com/EricKColl/LeriFitness` conectado.

---

Actúa como un ingeniero de software full stack sénior, con décadas de experiencia en producto,
arquitectura, UX y 3D en web. Vas a **continuar y terminar** una app de fitness que ya está
empezada en este repositorio (`EricKColl/LeriFitness`). Yo no escribo código, ni ejercicios, ni
contenido: lo haces todo tú y tomas todas las decisiones técnicas y de producto buscando el mejor
resultado posible. Solo me pedirás lo que únicamente yo puedo hacer (instalar programas o crear
cuentas gratuitas a mi nombre), y siempre con instrucciones paso a paso para alguien sin
experiencia. **Háblame siempre en español.**

Tu trabajo tiene tres partes, en este orden:

1. **Ponerte al día**: lee este prompt entero, luego `README.md`, `docs/ARCHITECTURE.md`,
   `docs/BRAND.md`, `docs/ROADMAP.md` y el código. Ejecuta `npm ci` y `npm run check`.
2. **Revisar y mejorar todo lo hecho**: audita con ojo crítico cada archivo existente (código,
   reglas de dominio, clasificación de ejercicios, traducciones, diseño, accesibilidad,
   rendimiento, seguridad, textos). Encuentra mejoras y aplícalas. No des nada por bueno solo
   porque ya exista. Deja constancia en los commits de qué mejoraste y por qué.
3. **Terminar el proyecto**: completa la Fase 1 (MVP desplegable), y después continúa con la
   Fase 2 y la Fase 3, verificando cada fase antes de pasar a la siguiente.

## RESTRICCIÓN ABSOLUTA: COSTE 0 €

Nada de pago: ni servidores, ni dominio, ni APIs, ni tiendas de apps. Antes de depender de
cualquier servicio, verifica sus condiciones gratuitas actuales. Por eso:

- Es una PWA instalable desde el navegador, sin App Store ni Google Play. Más adelante se podrá
  empaquetar con Capacitor.
- Se publica en un subdominio gratuito (`*.pages.dev`).
- Si algo del plan resulta no ser gratuito o no es viable hoy, elige la mejor alternativa gratuita
  y dímelo en una línea.

Verificado el 26/09/2026: Cloudflare Pages sigue gratuito y no está obsoleto (20 000 archivos por
sitio, 25 MiB por archivo, 500 builds al mes). GitHub Actions es gratuito en repos públicos (y
2000 min/mes en privados). Vuelve a comprobarlo si pasa tiempo.

## EL PRODUCTO

App de entrenamiento personalizado para gimnasio, en español (preparada para i18n: catalán e
inglés más adelante). Funciones:

1. Onboarding: peso, altura, sexo, edad, tipo de trabajo (sedentario/activo/físico), días y
   minutos disponibles, material disponible, experiencia, lesiones o molestias por zona, y
   objetivo (fuerza, hipertrofia, pérdida de grasa, salud general, resistencia).
2. Plan de entrenamiento personalizado que se adapta semana a semana.
3. Biblioteca de ejercicios con fotos, instrucciones claras, músculos principales y secundarios,
   errores comunes y variantes.
4. Sesión en vivo: temporizador de descanso y registro de series, repeticiones y peso.
5. Seguimiento del progreso: gráficas, medidas corporales, historial y un mapa muscular del
   volumen semanal.
6. Gamificación: logros por objetivos cumplidos, rachas y mensajes de motivación.
7. Anatomía interactiva del cuerpo humano (fase 2).
8. Asistente IA para resolver dudas (fase 3).

Requisitos de UX: diseño premium, original y muy visual; intuitivo, rápido, mobile-first, con modo
oscuro y animaciones fluidas (especialmente al desbloquear logros). No debe parecer una plantilla
genérica.

## DECISIONES DE ARQUITECTURA (YA TOMADAS, NO CAMBIARLAS SIN MOTIVO FUERTE)

- Frontend: React + TypeScript + Vite. PWA con vite-plugin-pwa (Workbox), totalmente offline.
- UI: Tailwind CSS + shadcn/ui + Motion.
- Estado y datos: arquitectura local-first. Dexie (IndexedDB) + Zustand. Los datos de salud se
  quedan en el dispositivo por defecto.
- Sincronización y cuentas (fase 3, opcional para el usuario): Supabase en región UE (Auth +
  Postgres con RLS + Edge Functions).
- Hosting: Cloudflare Pages. CI/CD con GitHub Actions.
- Anatomía 3D (fase 2): React Three Fiber + drei, modelo glTF comprimido con Draco/Meshopt,
  derivado de Z-Anatomy / BodyParts3D (licencia CC BY-SA 4.0: atribución obligatoria y los
  modelos modificados se comparten con la misma licencia). Hay que extraer solo músculos y
  esqueleto, reducir polígonos y dejarlo en pocos MB. En el MVP se usa un mapa muscular 2D en SVG
  propio (vista frontal y dorsal, músculos seleccionables y resaltables).
- IA (fase 3): híbrida. WebLLM en el dispositivo cuando haya WebGPU; si no, respaldo con el plan
  gratuito de Gemini a través de una Edge Function, con cuota por usuario. NUNCA se envían datos
  de salud ni personales a APIs gratuitas.
- Pagos (futuro): Stripe o Lemon Squeezy (sin cuota fija). Solo preparar la arquitectura de
  funciones premium; no integrar pagos reales sin que yo lo pida.

## REGLA CRÍTICA: EL PLAN NO LO GENERA UNA IA

El plan lo genera un motor de reglas determinista, escrito en TypeScript puro, desacoplado de la
UI y con tests unitarios (Vitest). Debe basarse en principios de entrenamiento con respaldo
científico:

- volumen semanal por grupo muscular según nivel y objetivo;
- frecuencia y split según los días disponibles;
- rangos de repeticiones y descansos según el objetivo;
- sobrecarga progresiva y descargas;
- ajustes según el tipo de trabajo;
- filtrado y sustitución de ejercicios según las contraindicaciones de cada lesión.

La IA solo explica y responde dudas; nunca decide el plan.

## BASE DE EJERCICIOS

Parte de free-exercise-db (github.com/yuhonas/free-exercise-db, dominio público, más de 800
ejercicios con imágenes). Hay que traducir todo al español con calidad nativa; normalizar los
músculos a un vocabulario propio que coincida con el mapa 2D y el modelo 3D; añadir etiquetas
propias (contraindicaciones por zona de lesión, patrón de movimiento, nivel, material y
alternativas); servir las imágenes optimizadas (WebP) desde el propio proyecto. Esquema de datos
tipado y validado (Zod). La base se genera mediante scripts reproducibles, no a mano.

## LEGAL

- Las lesiones son datos de salud (RGPD, art. 9): consentimiento explícito, minimización de datos,
  exportar y borrar datos en un clic.
- Redacta la política de privacidad y los términos de uso.
- La app se presenta como fitness y bienestar, nunca como rehabilitación ni tratamiento. Incluye
  avisos de «consulta a un profesional» en el onboarding y en las zonas lesionadas.
- Respeta y muestra las atribuciones de licencias.

## ROADMAP

- Fase 0: scaffolding, estructura por features, linting, formateo, tests y sistema de diseño;
  nombre e identidad de marca. **HECHA.**
- Fase 1 (MVP): onboarding, base de ejercicios, motor de planes, sesión en vivo, progreso, logros
  y mensajes de motivación, mapa muscular 2D y PWA offline. Despliegue en Cloudflare Pages.
  **EN CURSO.**
- Fase 2: anatomía 3D interactiva (músculos que se iluminan por ejercicio, mapa de calor semanal,
  zonas lesionadas).
- Fase 3: asistente IA, cuentas con sincronización opcional y funciones premium.

## FORMA DE TRABAJAR

- Trabaja de forma autónoma, por fases, con commits de git frecuentes y descriptivos (en español)
  y haz push a menudo para no perder trabajo. Trabaja en la rama que te asigne el entorno; al
  cerrar cada fase, abre un pull request hacia `main` y explícame cómo fusionarlo (o fusiónalo tú
  si el entorno te lo permite). Fusionar en `main` dispara el despliegue.
- Mantén `docs/ROADMAP.md` como lista de tareas viva (marca lo hecho) y actualiza este archivo
  (`docs/PROMPT_CONTINUACION.md`) si cambian decisiones importantes, para que otra sesión pueda
  retomar el trabajo.
- Código limpio, tipado estricto y bien estructurado; comentarios solo donde aporten; escribe
  como el código que ya hay (mismo estilo, nombres e idioms).
- Al terminar cada fase: verifica que compila (`npm run build`), que los tests pasan
  (`npm run check`) y que la app arranca (`npm run preview`). Si el entorno lo permite, usa
  Playwright para abrir la app en un viewport móvil (375×812), recorrer los flujos principales y
  hacer capturas para revisar el diseño; corrige lo que veas mal.
- Después dame un resumen breve de lo hecho y de lo que necesito hacer yo (si es algo), con
  instrucciones exactas.

---

## ACTUALIZACIÓN: FASE 1 TERMINADA (26/09/2026)

La sección «Estado actual» de más abajo describe el punto de partida de la Fase 1; se conserva
como referencia del diseño. Estado real ahora (ver `docs/ROADMAP.md`, que es la lista viva):

- Contenido en español completo (873/873), motor de planes (`src/engine`), datos locales
  (`src/data`), toda la interfaz de la Fase 1, CI/CD y `_headers`. `npm run check` pasa
  (126 tests) y la build se ha verificado con Playwright a 375×812.
- Decisiones tomadas durante la fase:
  - Despliegue con GitHub Actions + `wrangler pages deploy` (proyecto `forja`); si faltan los
    secretos, el workflow se omite sin fallar. Pasos para la persona titular en el README.
  - Sin `_redirects`: Cloudflare Pages ya sirve `index.html` como SPA si no hay `404.html`.
  - CSP estricta sin scripts en línea; el script anti-parpadeo del tema está en
    `public/theme-init.js`. En la Fase 3 habrá que ampliar `connect-src` (Supabase, modelos
    WebLLM) en `public/_headers`.
  - Gráficas SVG propias (`src/shared/ui/charts.tsx`) en lugar de una librería, por peso.
  - Mapa muscular 2D propio (`src/features/anatomy/body-map.tsx`) con `data-muscle` igual al
    vocabulario de `src/domain`: los nodos del modelo 3D deben usar esos mismos ids.
  - Datos del responsable del tratamiento en `src/config/legal.ts`; **se piden a la persona
    titular** (no inventarlos). Mientras falten, los textos legales muestran un aviso.
  - `window.forjaDev.seed()` (solo en desarrollo) genera historial realista para probar.
- Siguiente paso: Fase 2 (anatomía 3D).

## ACTUALIZACIÓN: FASE 2 TERMINADA (26/09/2026)

- Modelo 3D en `public/anatomy/body.glb`, generado por `scripts/anatomy/` (ver su README). Los
  nodos llevan `extras` (`muscle`, `side`) porque three.js elimina los «:» de los nombres.
- Visor en `src/features/anatomy/body-3d.tsx` (perezoso) y envoltorio con respaldo 2D en
  `anatomy-view.tsx`. Preferencia `anatomy3d` en `usePrefs` (`null` = automático).
- La CSP incluye `'wasm-unsafe-eval'` (decodificador Meshopt). El GLB está en el precache.
- Datos del responsable ya puestos (Erick Coll Rodríguez, erickcollrodriguez@gmail.com).
- Siguiente paso: Fase 3 (asistente que explica, cuentas opcionales, arquitectura premium).

## ACTUALIZACIÓN: FASE 3 TERMINADA (26/09/2026)

- Asistente en `src/features/assistant`: `knowledge.ts` (glosario + búsqueda), `context.ts`
  (contexto y `SYSTEM_PROMPT`; `buildContext(…, 'remote')` excluye todo dato personal o de salud),
  `local-llm.ts` + `llm.worker.ts` (WebLLM perezoso; `webllm.ts` da nombre al fragmento para
  excluirlo del precache), `remote.ts` (Edge Function `assistant`).
- Nube opcional en `src/data/cloud` (se activa con `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY`; en el despliegue salen de las variables del repositorio
  `SUPABASE_URL` y `SUPABASE_ANON_KEY`). `sync.ts` es la lógica (testada con un almacén en
  memoria); `account.ts` es el adaptador de Supabase y la cuenta.
- Solo se sincronizan `profile` (sin `injuries`), `sessions` (sin `notes`) y `achievements`.
  Si se amplía, actualizar la migración, `SYNCED_COLLECTIONS`, la política de privacidad y
  la pantalla de cuenta.
- Supabase: `supabase/` (migraciones, funciones y README con los pasos y límites gratuitos).
  La copia de `SYSTEM_PROMPT` en `supabase/functions/_shared/prompt.ts` debe coincidir (test).
- Premium: `src/features/premium/features.ts`; el plan solo lo escribe el servidor.
- Pendiente de la persona titular: crear el proyecto de Supabase y la clave de Gemini (hecho:
  ver la actualización siguiente).

## ACTUALIZACIÓN: PRODUCCIÓN EN MARCHA Y VERIFICADA (26/09/2026)

- App: https://forja-13u.pages.dev (Cloudflare añadió el sufijo porque «forja» ya existía; si
  cambia, crear la variable del repositorio `APP_URL`). Supabase en la UE con migraciones y
  funciones publicadas por el workflow «Supabase»; secretos y variables ya creados en GitHub.
- Inicio de sesión con **enlace mágico** (Supabase solo deja editar plantillas con SMTP propio).
  La Site URL y las Redirect URLs (`https://forja-13u.pages.dev/**`) se configuran a mano en
  _Authentication › URL Configuration_; la comprobación avisa si no coinciden.
- Edge Functions con `verify_jwt = false`: verifican la sesión ellas mismas
  (`supabase/functions/_shared/admin.ts`) porque el proyecto usa las claves nuevas
  (`sb_publishable_…`/`sb_secret_…`).
- Asistente en la nube con `gemini-3.5-flash-lite` (Google retiró `gemini-2.5-flash-lite` para
  cuentas nuevas). Se puede cambiar con el secreto de Supabase `GEMINI_MODEL`.
- Workflow «Comprobación» (`.github/workflows/smoke.yml` + `scripts/smoke/production.ts`): tras
  cada despliegue, cada lunes y a mano. Prueba web y cabeceras, Gemini directamente, la
  configuración de Auth y la nube con un usuario temporal que se borra al final. La clave de
  servidor se pide en cada ejecución a la API de gestión y nunca se guarda. Primer resultado en
  `main`: 20/20 en verde. La ejecución semanal además evita que Supabase pause el proyecto.
- Seguridad: los tokens de Cloudflare y Supabase que se pegaron en el chat deben estar
  revocados y sustituidos; los secretos solo se guardan en GitHub.

## ACTUALIZACIÓN: MAGICERICK (26/09/2026)

- El asistente es **MagicErick**, una ventana flotante (ya no hay página `/asistente`; la ruta
  abre la ventana). Entradas en `src/features/assistant/launcher.tsx` (botón flotante en
  `AppLayout`, contenedor en `RequireProfile`, botón compacto en la cabecera de la sesión) y
  ventana perezosa en `MagicErickPanel.tsx`. Para abrirla desde cualquier sitio:
  `openMagicErick(exerciseId?)` de `store.ts`.
- Quién responde (`engine.ts`, función pura `pickEngine` testada): modelo del dispositivo si
  está listo → nube si hay sesión y está activada → glosario. `use-chat.ts` cae a la siguiente
  vía si una falla.
- Móviles y tabletas (`device.ts`): no se usan modelos locales (necesitan 1-1,6 GB de memoria
  gráfica y se colgaban). En el ordenador, `local-llm.ts` hace una prueba de arranque y
  `watchdog.ts` pone límites de tiempo; si el modelo se cuelga se destruye el worker y se marca
  `assistantLocalFailed` en las preferencias para no volver a cargarlo solo.
- Cambiar el nombre o el prompt: `SYSTEM_PROMPT` en `context.ts` y su copia en
  `supabase/functions/_shared/prompt.ts` (un test exige que coincidan; el workflow «Supabase»
  republica la función al fusionar).

## ESTADO ACTUAL DEL PROYECTO (26/09/2026, inicio de la Fase 1)

Hay 2 commits previos en `main` más el de este traspaso. Todo `npm run check` pasa (tipos, lint,
formato y 8 tests).

### Marca: «Forja» (propuesta, cambiable)

La carpeta original se llamaba LeriFitness; propuse la marca **Forja** («Entrena con criterio.
Progresa con calor.»). Concepto: el gimnasio como fragua. Serie de trabajo = ascua (naranja),
descanso = temple (azul acero), volumen semanal = mapa de calor, logros = medallas forjadas
(bronce, plata, oro, damasco), racha = llama. Tono: directo, cálido, experto, tuteo, sin culpa ni
promesas milagro. Símbolo: llama con una «F» en negativo. Todo en `docs/BRAND.md`. Si el usuario
quiere otro nombre, está centralizado en: `src/config/brand.ts`, `index.html`,
`scripts/build/pwa.ts` (manifiesto), `src/i18n/locales/es/common.json` (`appName`), `README.md`,
`docs/BRAND.md` y `src/shared/ui/logo.tsx`.

### Stack instalado (versiones reales)

React 19.3 · React Router 8.4 · Vite 8.3 (Rolldown) + @vitejs/plugin-react 6 · **TypeScript
fijado en ~6.0.3** (typescript-eslint 8.70 solo soporta TS < 6.1; no subir a TS 7 hasta que lo
soporte) · Tailwind 4.3 con `@tailwindcss/vite` · shadcn/ui (paquete unificado `radix-ui` 1.6) ·
motion 13 (`import { motion } from 'motion/react'`) · Zod 4.6 (`z.partialRecord`,
`z.prettifyError`, `z.url`) · Dexie 4.4 + dexie-react-hooks · Zustand 5 · i18next 26 +
react-i18next 17 · lucide-react 1.48 · sonner 2 · vite-plugin-pwa 1.3 + workbox-window ·
Vitest 5 + jsdom 30 + Testing Library + fake-indexeddb · ESLint 10 (flat config) con
typescript-eslint type-checked, `eslint-plugin-react-hooks` 7 (`flat['recommended-latest']`, que
incluye reglas del React Compiler) y react-refresh · Prettier 3.9 + plugin de Tailwind · sharp,
tar, tsx para scripts. Fuentes autoalojadas con fontsource: Inter Variable y Bricolage Grotesque
Variable (ejes wght+wdth). Node 24 (`.nvmrc`), `engines >= 22`.

Notas de API: React Router 8 mantiene la API de data routers de la v7 (`createBrowserRouter`
desde `react-router`, `RouterProvider` desde `react-router/dom`, rutas con `lazy`).

### Comandos

```
npm run dev            # servidor de desarrollo (5173)
npm run build          # tsc -b && vite build (genera también el service worker)
npm run preview        # sirve dist/
npm run check          # typecheck + lint + prettier --check + vitest
npm run icons          # regenera favicon e iconos PWA desde el trazado del logo
npm run data:exercises # regenera catálogo, contenido e imágenes (flags: --no-images, --allow-missing)
npm run data:dump      # vuelca ejercicios de origen para redactar contenido (ver más abajo)
npm run data:review    # lista ejercicios por patrón inferido (control de calidad)
```

### Estructura actual

```
index.html                 tema aplicado antes del primer pintado (evita parpadeo)
vite.config.ts             react + tailwind + PWA; alias @ → src
vitest.config.ts           jsdom, setup en src/test/setup.ts, incluye src/** y scripts/**
eslint.config.js           pureza del motor: src/engine y src/domain no pueden importar React,
                           Dexie, Zustand, i18next, @/features, @/app, @/data, @/shared ni usar
                           window/document/localStorage/indexedDB/navigator
tsconfig*.json             estricto + noUncheckedIndexedAccess + erasableSyntaxOnly; paths @/*
components.json            shadcn con alias a @/shared/ui (ver aviso más abajo)
.claude/launch.json        config de preview para la app de escritorio (forja-dev / forja-preview)
public/                    favicon.svg, pwa-192x192.png, pwa-512x512.png,
                           maskable-icon-512x512.png, apple-touch-icon.png, favicon-64x64.png
public/exercises/<id>/<n>.webp   1746 imágenes (873 ejercicios × 2), 640 px, ~20 KB, 34 MB total
scripts/build/pwa.ts       configuración de vite-plugin-pwa (ver PWA)
scripts/icons/generate.ts  iconos con sharp desde LOGO_MARK_PATH
scripts/exercises/         pipeline de datos (ver abajo)
src/main.tsx               fuentes, estilos, i18n, initTheme(), <App/>
src/app/App.tsx            TooltipProvider + RouterProvider
src/app/router.tsx         de momento solo «/» → DesignSystemPage (lazy) — hay que sustituirlo
src/config/brand.ts        nombre, lema, colores de theme-color y trazado del logo
src/domain/                vocabulario y esquemas compartidos (puro)
src/data/generated/        exercises.json (catálogo) y exercises.es.json (contenido) — generados
src/features/design-system/DesignSystemPage.tsx   muestrario del sistema de diseño
src/i18n/                  i18next tipado (i18next.d.ts), namespace «common» en es
src/shared/lib/utils.ts    cn()
src/shared/stores/theme.ts Zustand persistido («forja-theme»), oscuro por defecto, sigue al sistema
src/shared/ui/             componentes shadcn + logo.tsx
src/styles/index.css       tokens de diseño (ver abajo)
docs/                      ARCHITECTURE, BRAND, ROADMAP y este prompt
```

### Sistema de diseño (`src/styles/index.css`)

- Tokens OKLCH con variantes clara (`:root`) y oscura (`.dark`, por defecto). Nombres de shadcn
  (`--background`, `--card`, `--primary`…) más propios: `--ember`, `--ember-hot`, `--steel`,
  `--steel-soft`, `--success`, `--warning`, escala `--heat-0…5` (mapa muscular), medallas
  `--bronze`, `--silver`, `--gold`, `--damascus`, `--surface-glow`.
- `@custom-variant dark (&:where(.dark, .dark *))`; `@theme inline` expone todos como utilidades
  (`bg-ember`, `text-steel`, `bg-heat-3`…), `--font-display` (Bricolage, `font-stretch: 88%` en
  h1-h3) y `--font-sans` (Inter), radios ampliados, curvas `--ease-forge` y `--ease-spring`,
  animaciones `ember-pulse` y `shimmer`.
- Clases: `.grain` (textura de ruido), `.surface`, `.surface-glow`, `.text-ember-gradient`,
  `.bg-ember-gradient`, `.skeleton`; utilidades `pb-safe`, `pt-safe`, `scrollbar-none`.
- Respeta `prefers-reduced-motion`.
- `Button` personalizado: variantes `default` (degradado ascua con brillo interior), `solid`,
  `destructive`, `outline`, `secondary`, `ghost`, `steel`, `link`; tamaños `default` (h-12),
  `xs`, `sm`, `lg`, `xl`, `icon`, `icon-sm`, `icon-lg`; `active:scale-[0.97]`.
- El resto de componentes shadcn (accordion, badge, checkbox, dialog, dropdown-menu, input, label,
  popover, progress, radio-group, scroll-area, select, separator, sheet, slider, switch, tabs,
  toggle, toggle-group, tooltip) están **sin adaptar a la marca**: revisa radios, alturas táctiles
  (≥ 44 px), colores y estados.
- **Aviso shadcn CLI**: la primera vez no resolvió el alias, creó una carpeta literal `@/` e
  instaló un paquete npm falso llamado `cn`. Ya está corregido (paths en el `tsconfig.json`
  raíz). Si añades componentes con el CLI, comprueba que se crean en `src/shared/ui`, que importan
  `cn` desde `@/shared/lib/utils` y que no se instala el paquete `cn`.

### PWA (`scripts/build/pwa.ts`)

`registerType: 'prompt'`, `injectRegister: false` (hay que registrar el SW con
`virtual:pwa-register/react` → `useRegisterSW` y mostrar un aviso «Nueva versión disponible»).
Precache: js, css, html, svg, png, webmanifest y solo las fuentes `*-latin-*.woff2`. Se ignoran
`exercises/**`; las imágenes van con `CacheFirst` (caché `exercise-images`, 2500 entradas, 1 año).
`navigateFallback: 'index.html'`. Manifiesto en español, `display: standalone`, retrato, colores
`#0f0d0c`. Los tipos `vite-plugin-pwa/react` y `/info` ya están en `tsconfig.app.json`.

### Dominio (`src/domain`, TS puro)

- `muscles.ts`: vocabulario de 20 músculos (ids = futuras regiones del SVG y nodos 3D):
  `chest, frontDelts, sideDelts, rearDelts, biceps, triceps, forearms, abs, obliques, quads,
hamstrings, glutes, adductors, abductors, calves, lats, upperBack, traps, lowerBack, neck`, con
  región (upper/lower/core) y vistas (front/back).
- `equipment.ts`: `bodyweight, barbell, rack, ezBar, dumbbell, kettlebell, cable, machine, bench,
pullupBar, dipStation, bands, medicineBall, stabilityBall, foamRoller, box, other`; un
  ejercicio requiere TODO su material; presets `fullGym`, `homeDumbbells`, `homeBasic`,
  `bodyweight`; `hasEquipment()`.
- `injuries.ts`: zonas `neck, shoulder, elbow, wrist, lowerBack, hip, knee, ankle`; estrés
  `low/moderate/high`; severidad del usuario `mild/moderate/severe`;
  `isContraindicated(stress, severity)`: _mild_ excluye `high`; _moderate_ excluye `moderate` y
  `high`; _severe_ solo permite `low`.
- `patterns.ts`: 34 patrones de movimiento (squat, hinge, lunge, hipExtension, kneeExtension,
  kneeFlexion, calfRaise, hipAbduction, hipAdduction, horizontalPush, verticalPush, chestFly, dip,
  horizontalPull, verticalPull, pullover, shrug, lateralRaise, frontRaise, rearDelt, elbowFlexion,
  elbowExtension, wrist, coreFlexion, coreAntiExtension, coreRotation, coreLateral, carry, neck,
  olympic, plyometric, cardio, mobility, other) y `STRENGTH_PATTERNS` (los programables).
- `levels.ts`: beginner/intermediate/advanced con rango numérico.
- `exercise.ts`: esquemas Zod `ExerciseSchema` (id kebab, sourceId, category, level, mechanic,
  force, pattern, equipment[], primaryMuscles[], secondaryMuscles[] disjuntos, jointStress
  parcial por zona, unilateral, staple 0-3, images `<id>/<n>.webp`, alternatives[]),
  `ExerciseContentSchema` (name, steps[], tips?, mistakes?), `ExerciseCatalogSchema`,
  `ExerciseLocaleSchema`.

### Pipeline de ejercicios (`scripts/exercises/`)

- `source.ts`: free-exercise-db fijado en el commit
  `a859101d633a01c4a1a920d6a8ce41dabba0705f` (licencia Unlicense). Hay una **copia versionada**
  del JSON de origen en `vendor/free-exercise-db-a859101.json`, así que datos y contenido se
  regeneran sin red. La descarga del tarball (a `.cache/`, ignorada) solo ocurre si falta alguna
  imagen.
- `normalize.ts`: `slugify`, categorías (`olympic weightlifting` → `olympic`), niveles
  (`expert` → `advanced`), `inferPattern` (reglas por nombre/músculo/fuerza, **el orden importa**),
  `mapMuscles` (shoulders → cabeza del deltoides según patrón; los presses verticales añaden
  deltoides lateral y tríceps como secundarios; abdominales → oblicuos por palabras clave),
  `mapEquipment` (añade rack/bench/pullupBar/dipStation/box por contexto), `inferJointStress`
  (estrés base por patrón + modificadores por palabras clave) e `inferUnilateral`.
- `overrides.ts`: `STAPLES` (~230 ejercicios con prioridad 1-3 para el motor; por defecto 1 si es
  fuerza/powerlifting programable y no avanzado, 0 en el resto) y `OVERRIDES` (correcciones
  puntuales de patrón, material, músculos, estrés o unilateralidad). El build falla si una clave
  no existe.
- `build.ts`: genera `src/data/generated/exercises.json` (873 ejercicios ordenados por id; se
  excluyen 3 sin imágenes), `exercises.es.json` (id → contenido) y las imágenes
  (`640 px inside, WebP q68 effort 5`). Alternativas: top 6 por puntuación (mismo patrón +10,
  solape de principales ×4, de secundarios ×1, staple ×1.5, misma categoría +1; no mezcla
  estiramientos con entrenamiento). Sin `--allow-missing` falla si falta cualquier traducción.
- El contenido se escribe con clave = **sourceId** (p. ej. `Barbell_Squat`) y sale con clave =
  id slug (`barbell-squat`).
- `catalog.test.ts`: valida el catálogo generado, alternativas, imágenes existentes, básicos por
  patrón, claves del contenido y reglas de normalización.
- `tools/dump.ts` y `tools/review.ts`: herramientas de redacción y control de calidad.

### Contenido en español: 300 de 873 hechos

Archivos `scripts/exercises/content/es/01.json` a `06.json` (50 ejercicios cada uno, en orden
alfabético de slug, del `3_4_Sit-Up` al `Glute_Ham_Raise`). **Faltan 573.** Para continuar:

```
npm run data:dump -- --missing es 50     # los 50 siguientes sin contenido (en inglés)
# redacta scripts/exercises/content/es/07.json, 08.json, …
npx tsx scripts/exercises/build.ts --no-images --allow-missing   # valida cada lote
npm run data:exercises -- --no-images    # al terminar: validación estricta (sin --allow-missing)
```

Guía de estilo (obligatoria; revisa también los lotes 01-06 con ella y corrígelos si hace falta):

- Español de España, calidad nativa, tuteo e imperativo («Túmbate», «Agarra», «Baja despacio»).
  No es una traducción literal: reescribe con claridad. Elimina relleno como «Repite las
  repeticiones recomendadas». Unidades métricas (pulgadas → cm, pies → m, libras → kg).
- `name`: nombre habitual en gimnasios españoles, en minúscula de frase. Términos aceptados:
  press, curl, pullover, hip thrust, face pull, kettlebell, fitball, multipower (Smith machine),
  polea alta/baja, barra Z, jalón, remo, pájaros, aperturas, fondos, zancada, sentadilla, peso
  muerto (rumano), press militar, encogimientos, elevación de talones, prensa, curl femoral,
  extensión de cuádriceps, rompecráneos/press francés, cargada, arrancada, dos tiempos, envión.
  Los nombres deben ser **únicos** (añade un test que lo compruebe).
- `steps`: 3-5 pasos (máximo 6), una o dos frases cada uno: posición inicial → ejecución →
  vuelta. Incluye respiración y seguridad solo cuando aporten.
- `mistakes`: 2-4 errores comunes **obligatorios** en todos los ejercicios marcados con ★2 o ★3
  en el volcado (son los básicos que programa el motor); opcionales en el resto (que heredarán
  errores genéricos por patrón, ver abajo).
- `tips`: 0-2 consejos opcionales.
- No uses comillas dobles ASCII dentro de los textos; usa «comillas españolas».
- JSON: `{ "<sourceId>": { "name": "…", "steps": ["…"], "mistakes": ["…"], "tips": ["…"] } }`.

Además, crea textos de **errores comunes genéricos por patrón** (i18n) para los ejercicios sin
errores propios.

### Calidad de la clasificación: revisar

La inferencia es buena pero no perfecta. Revisa con `npm run data:review -- <patrones>` y corrige
en `OVERRIDES`. Casos dudosos conocidos: «Dumbbell Raise» (ambiguo), «Kettlebell Thruster»
(clasificado como press vertical), «Car Drivers» (elevación lateral), «Balance Board» (gemelos),
ejercicios de strongman en `other`, rotaciones de hombro (`rearDelt`/`other`). Revisa también el
estrés articular de los básicos (★3), que es lo que más afecta a la seguridad de los planes.

---

## LO QUE FALTA (FASE 1) Y CÓMO LO TENÍA DISEÑADO

Usa este diseño como punto de partida; mejóralo si encuentras algo mejor, justificándolo.

### Motor de planes (`src/engine`, TS puro, determinista, sin `Math.random`)

Entradas: perfil (sexo, edad, altura, peso, tipo de trabajo, días 1-6, minutos 20-120, material,
nivel, lesiones, objetivo), catálogo, historial de sesiones registradas, estado del plan y
check-in semanal opcional. Salida: plan (mesociclo → semanas → días → prescripciones), más una
lista de **razones** (claves i18n + parámetros) que explican cada decisión y avisos.

- **Volumen** en series semanales por músculo; las series cuentan 1 para músculos principales y
  0,5 para secundarios (conteo fraccional, Pelland et al. 2024). Rangos base orientativos
  (intermedio, hipertrofia): pecho 10-16, dorsal 8-14, espalda alta 6-12, deltoides lateral 8-16,
  posterior 6-12, anterior 0-6 (indirecto), bíceps 6-14, tríceps 6-12, cuádriceps 8-16,
  isquiotibiales 6-12, glúteos 4-12, gemelos 6-12, abdomen 4-12; oblicuos, aductores, antebrazo,
  trapecio, lumbar y cuello 0-6/8 (indirectos). Multiplicadores: nivel (principiante 0,6,
  intermedio 1, avanzado 1,2), objetivo (hipertrofia 1, fuerza 0,8, pérdida de grasa 0,85, salud
  0,6, resistencia 0,7), edad ≥ 60 ×0,9, trabajo físico ×0,85 en tren inferior y espalda,
  sedentario con más énfasis en espalda alta, deltoides posterior, glúteos y movilidad.
  Referencias: Schoenfeld 2017 (dosis-respuesta), Schoenfeld 2016 (frecuencia 2×/semana),
  Schoenfeld 2016 (descansos), Schoenfeld 2021 (cargas 6-30 reps cerca del fallo), ACSM 2009,
  OMS 2020 (2 días de fuerza + 150-300 min aeróbicos), Zourdos 2016 (RIR/RPE), consenso sobre
  descargas (Bell 2023).
- **Split** según días y nivel: 1 → cuerpo completo; 2 → FB A/B; 3 → FB A/B/C (principiante) o
  torso/pierna/completo (intermedio/avanzado); 4 → torso/pierna ×2 (A/B); 5 → torso, pierna,
  empuje, tirón, pierna; 6 → PPL ×2. Máximo 6 días (el descanso también construye).
- **Plantillas de día** por huecos de patrón con prioridad (principal/secundario/accesorio). Ej.:
  FB-A: sentadilla, empuje horizontal, tracción horizontal, bisagra, elevación lateral,
  bíceps/tríceps, core. FB-B: bisagra, empuje vertical, tracción vertical, zancada, deltoides
  posterior, tríceps, gemelos. FB-C: variante de sentadilla, empuje inclinado, remo, hip thrust,
  lateral, bíceps, core. Torso A/B, Pierna A/B, Empuje, Tirón y Pierna análogos.
- **Selección** por hueco: candidatos del patrón, categoría fuerza/powerlifting, material
  disponible, no contraindicados para ninguna lesión, nivel adecuado y staple ≥ 1. Puntuación:
  staple, encaje con objetivo y nivel (principiantes: máquinas y mancuernas; fuerza: barra en los
  principales), variedad entre días (no repetir el mismo ejercicio en A y B si hay alternativa),
  desempate por id. Si no hay candidato: patrones de respaldo (p. ej. sentadilla → zancada o hip
  thrust) o eliminar el hueco, registrando la sustitución en las razones.
- **Series y tiempo**: reparto voraz hacia el objetivo semanal, 2-5 series por hueco, principales
  primero. Estimación: calentamiento 5-8 min + (≈40 s de trabajo + descanso) por serie + 1 min
  por cambio de ejercicio. Si no cabe, recorta accesorios; si falta mucho tiempo, superseries de
  antagonistas.
- **Reps, RIR y descanso** por objetivo: fuerza 3-6 reps RIR 1-3, descanso 3-4 min (accesorios
  6-10, 2 min); hipertrofia 6-10 compuestos / 10-15 aislados, RIR 1-2 (principiantes 2-3),
  2-2,5 min / 60-90 s; pérdida de grasa 8-12 / 12-15, RIR 2, 90 s / 60 s + acondicionamiento;
  salud 8-12 / 10-15, RIR 2-3, 90 s / 60 s; resistencia 12-20 / 15-25, RIR 2-3, 45-60 s / 30-45 s,
  circuitos opcionales.
- **Progresión**: doble progresión. Si todas las series llegan al tope del rango con el esfuerzo
  objetivo → sube carga (barra 2,5 kg, mancuernas 2 kg, máquinas/polea 2,5-5 kg, kettlebell 4 kg)
  y vuelve al mínimo del rango; si se queda por debajo del mínimo en la mitad de las series →
  −5-10 %. e1RM con Epley corregido por RIR: `e1RM = kg × (1 + (reps + RIR) / 30)`; carga
  sugerida para reps objetivo. Semana 1 de calibración: «elige un peso que te deje 2-3
  repeticiones en reserva».
- **Mesociclos y descargas**: principiante 6 + 1, intermedio 4 + 1, avanzado 3-4 + 1. +1 serie
  por músculo y semana (hasta el máximo) si la adherencia ≥ 90 % y no hay señales negativas;
  mantener entre 70-90 %; reducir por debajo del 70 % o con fatiga. Descarga anticipada si el
  rendimiento cae dos sesiones seguidas, el RPE de sesión es muy alto o el check-in lo indica.
  Descarga: series ×0,5 y RIR +2 (o −10 % de carga).
- **Adaptación semanal**: adherencia, rendimiento por ejercicio, RPE de sesión (1-10) y check-in
  opcional (energía, sueño, agujetas, molestias por zona; una molestia puntual se trata como
  lesión leve temporal).
- **Calentamiento**: 5 min generales + series de aproximación del primer compuesto (≈40 %×8,
  60 %×5, 80 %×3 de la carga de trabajo).
- **Cardio**: pérdida de grasa, resistencia y salud añaden bloques de acondicionamiento con los
  básicos de cardio según material; mensaje con la recomendación de la OMS.
- **Gasto energético** informativo: Mifflin-St Jeor × factor de actividad (trabajo + días), con
  aviso de que es una estimación.
- **Tests** exhaustivos: combinaciones de días × material × lesiones × objetivos × nivel
  comprobando que el plan siempre es válido, que nunca incluye ejercicios contraindicados, que el
  volumen está en rango y que el tiempo cabe en el presupuesto; más tests unitarios de
  progresión, descargas y adaptación.

### Datos locales (Dexie + Zustand)

Tablas versionadas con migraciones: perfil, consentimientos (fecha y versión del texto), planes,
sesiones con series (ejercicio, kg, reps, RIR, hora), medidas, logros desbloqueados, ajustes y
check-ins. Carga perezosa del catálogo (import dinámico del JSON, con hash y precacheado).
**Exportar** todo a JSON e **importar**; **borrar todo en un clic** (con confirmación):
`db.delete()`, cachés, localStorage y vuelta al onboarding.

### Interfaz (mobile-first, barra inferior: Hoy · Plan · Ejercicios · Progreso · Perfil)

- **Onboarding** por pasos animados; paso de consentimiento explícito (casilla sin marcar) antes
  de las lesiones; si no consiente, se omiten; avisos de «consulta a un profesional»; resumen y
  animación de generación del plan.
- **Hoy**: saludo con mensaje de motivación, tarjeta de la sesión de hoy con CTA, tira semanal,
  racha y datos rápidos.
- **Plan**: semana, detalle de día, «por qué este plan» (razones del motor), indicador de
  descarga, editar perfil y regenerar.
- **Biblioteca**: búsqueda sin acentos, filtros (músculo, material, patrón, nivel, categoría),
  lista virtualizada si hace falta, ficha con fundido animado entre las dos fotos (efecto de
  movimiento), pasos, errores, consejos, músculos en mini mapa, avisos si carga una zona lesionada
  y alternativas.
- **Sesión en vivo**: ejercicio actual, objetivo series × reps @ RIR, peso sugerido, selectores
  grandes de reps y kg, chips de esfuerzo (Fácil / Justo / Al límite), temporizador de descanso
  basado en marcas de tiempo (color acero, anillo circular), vibración y pitido (Web Audio), Wake
  Lock, sustituir ejercicio (alternativas filtradas por material y lesiones), añadir o saltar
  series, notas, sesión persistida para recuperarla tras recargar, resumen final (duración,
  volumen, récords, logros).
- **Progreso**: gráficas (propias en SVG o una librería ligera) de e1RM por ejercicio, volumen
  semanal, peso corporal; medidas (alta, edición, gráfica); historial; **mapa muscular 2D** propio
  en SVG (frontal y dorsal, regiones con `data-muscle` = vocabulario, seleccionables, escala
  `--heat-*` según series semanales frente al objetivo, leyenda).
- **Logros** con niveles bronce/plata/oro/damasco: primer entreno, 5/10/25/50/100 sesiones,
  rachas semanales 2/4/8/12/26/52, récords personales, toneladas acumuladas, semana completa,
  madrugador/nocturno, medidas registradas, mapa muscular completo en una semana, primera
  descarga. Animación de desbloqueo a pantalla completa (medalla que se forja, chispas, brillo,
  vibración), respetando `prefers-reduced-motion`.
- **Motivación**: biblioteca de mensajes en español por contexto (hora, racha, vuelta tras un
  parón, récord, descarga, primera semana), elección determinista diaria.
- **Perfil/Ajustes**: editar perfil (regenera el plan), tema, sonido y vibración, idioma (solo es
  por ahora), exportar/importar/borrar datos, legal, licencias y atribuciones, acerca de.
- **Legal**: política de privacidad y términos en español (datos solo en el dispositivo,
  art. 9 RGPD, consentimiento, derechos, sin transmisión), aviso de salud, atribuciones
  (free-exercise-db Unlicense, Inter y Bricolage OFL, Lucide ISC; en fase 2 Z-Anatomy/BodyParts3D
  CC BY-SA 4.0). El responsable del tratamiento va en un archivo de configuración: **pídeme** el
  nombre y el email de contacto que quiero publicar; no uses ninguno sin preguntarme.
- **PWA**: `useRegisterSW` con aviso de actualización, indicador sin conexión, precarga de las
  imágenes del plan activo, opción «Descargar todas las imágenes» (34 MB), invitación a instalar
  (`beforeinstallprompt`) e instrucciones para iPhone.
- **Calidad**: rutas con carga perezosa, accesibilidad (etiquetas, foco, contraste, objetivos
  táctiles ≥ 44 px, movimiento reducido), sin parpadeos de tema. Sustituye la ruta «/» actual por
  la app real y mueve el muestrario de diseño a una ruta interna (p. ej. `/dev/diseno`) o
  elimínalo.

### CI/CD y despliegue

- `.github/workflows/ci.yml` (push y PR): Node 24, `npm ci`, `npm run check`, `npm run build`.
- `.github/workflows/deploy.yml` (push a `main`): build y `cloudflare/wrangler-action`
  (`pages deploy dist --project-name=<nombre>`) con los secretos `CLOUDFLARE_API_TOKEN` y
  `CLOUDFLARE_ACCOUNT_ID`. Comprueba la versión actual de la acción. Alternativa sin secretos:
  conectar el repo desde el panel de Cloudflare Pages; elige la más sencilla para mí y explícamela.
- `public/_headers`: caché inmutable para `/assets/*`, larga para `/exercises/*`, sin caché para
  `sw.js` e `index.html`; cabeceras de seguridad (CSP, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`). Asegura el fallback SPA (`_redirects`
  `/* /index.html 200` si hace falta).
- Lo que tendré que hacer yo (dámelo paso a paso cuando llegue el momento): crear la cuenta
  gratuita de Cloudflare, crear el token de API con permiso de Pages y copiar el Account ID, y
  añadirlos como secretos en GitHub (o conectar el repo en Cloudflare).

## FASES 2 Y 3 (después del MVP desplegado)

- Fase 2: pipeline reproducible del modelo 3D (descarga de Z-Anatomy/BodyParts3D, extracción de
  músculos y esqueleto, decimado, nombres de malla mapeados al vocabulario de `src/domain`,
  compresión Draco/Meshopt, objetivo de pocos MB), visor R3F + drei cargado de forma perezosa,
  músculos que se iluminan por ejercicio, mapa de calor semanal, zonas lesionadas, atribución
  CC BY-SA 4.0 y publicación del modelo derivado con la misma licencia. Mantén el mapa 2D como
  respaldo para dispositivos sin WebGL potente.
- Fase 3: asistente que **solo explica** (nunca decide el plan): WebLLM si hay WebGPU; si no,
  Gemini (plan gratuito, verifica condiciones) vía Supabase Edge Function con cuota por usuario,
  sin enviar jamás datos de salud ni personales. Cuentas y sincronización opcionales con
  Supabase en la UE con RLS; el modo local sigue siendo el predeterminado. Arquitectura de
  funciones premium sin pagos reales. Pídeme las cuentas gratuitas necesarias con instrucciones
  paso a paso cuando llegues ahí.

## AVISOS PRÁCTICOS

- El repo incluye 34 MB de imágenes y los JSON generados a propósito, para que la app compile sin
  regenerar nada. Si cambias la resolución o la calidad de las imágenes, bórralas y regenera con
  `npm run data:exercises` (necesita red para el tarball de origen).
- `.gitattributes` fuerza finales de línea LF.
- `src/data/generated/` está excluido de ESLint y Prettier; `scripts/exercises/content` y
  `scripts/exercises/vendor` están excluidos de Prettier.
- Los commits deben terminar con la línea de coautoría que indique el entorno.

Empieza ahora: ponte al día, revisa y mejora lo existente y continúa por la primera fase sin
terminar de `docs/ROADMAP.md`.
