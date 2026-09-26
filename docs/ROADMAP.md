# Roadmap y lista de tareas

> Estado a 26/09/2026. Para continuar el trabajo, lee también `docs/PROMPT_CONTINUACION.md`.

## Fase 0 — Cimientos ✅

- [x] Proyecto Vite 8 + React 19 + TypeScript 6 estricto
- [x] Estructura por features, alias `@/`
- [x] ESLint (type-checked, reglas de pureza del motor), Prettier, EditorConfig
- [x] Vitest + Testing Library + fake-indexeddb
- [x] Tailwind 4 + shadcn/ui + Motion; tokens de diseño claro/oscuro
- [x] Marca: nombre, símbolo, paleta, tipografía (`docs/BRAND.md`)
- [x] Iconos PWA generados por script (`npm run icons`)
- [x] Configuración PWA (Workbox) — pendiente de conectar el registro y el aviso de actualización

## Fase 1 — MVP ✅ (publicada en Cloudflare Pages)

- [x] Vocabulario de dominio: músculos, material, lesiones, patrones, niveles (`src/domain`)
- [x] Esquemas Zod del catálogo y del contenido traducible
- [x] Pipeline reproducible del catálogo (origen fijado, normalización, inferencias, correcciones
      curadas, alternativas) y 1746 imágenes WebP
- [x] Contenido en español: **873 de 873** ejercicios con pasos, errores y consejos; guía de estilo
      comprobada por tests
- [x] Errores comunes por patrón (i18n) para ejercicios sin errores propios
- [x] Motor de planes determinista y testado (`src/engine`): volumen por músculo, split, series y
      repeticiones, descansos, doble progresión, e1RM, mesociclos con descarga, adaptación
      semanal, trabajo, edad, lesiones, tiempo disponible, cardio OMS, gasto energético
- [x] Capa de datos local (Dexie versionado) + exportar, importar y borrar en un clic
- [x] App shell: router con carga perezosa, layout con barra inferior, tema, i18n tipado
- [x] Onboarding en 10 pasos con consentimiento explícito de salud y avisos
- [x] Pantalla «Hoy», plan semanal con razones del motor, detalle del día y check-in semanal
- [x] Biblioteca: búsqueda sin tildes, filtros, lista incremental y ficha con animación
- [x] Sesión en vivo: registro, esfuerzo en chips, descanso con anillo, pitido y vibración,
      Wake Lock, sustituciones, recuperación tras recargar, resumen con récords y RPE
- [x] Progreso: mapa muscular 2D de calor, e1RM, volumen semanal, medidas, historial
- [x] 22 logros en 4 rangos con celebración, rachas y mensajes de motivación
- [x] Legal: privacidad, términos, aviso de salud, licencias y atribuciones
- [x] PWA offline completa, aviso de actualización, invitación a instalar (incl. iOS),
      precarga de imágenes del plan y descarga opcional de todo el catálogo
- [x] CI (GitHub Actions), despliegue en Cloudflare Pages, `_headers` con CSP estricta
- [x] Verificación: build, check, preview y E2E con Playwright a 375×812 (claro y oscuro,
      con CSP y sin conexión)
- [x] Datos del responsable del tratamiento en `src/config/legal.ts`
- [x] Cuenta gratuita de Cloudflare y secretos del repositorio: despliegue automático activo

## Fase 2 — Anatomía 3D ✅

- [x] Pipeline reproducible del modelo (`npm run anatomy:build`): Z-Anatomy (commit fijado y
      sha256) → Blender (`bpy`) → músculos agrupados + esqueleto + anclas de lesión → glTF con
      Meshopt (549 KB, ~117 000 triángulos, simetría para el lado derecho)
- [x] Visor React Three Fiber + drei con carga perezosa: músculos por ejercicio con encuadre,
      mapa de calor semanal interactivo, músculos de cada sesión, zonas con molestias
- [x] Mapa 2D como respaldo (sin WebGL 2, dispositivos modestos, error o preferencia)
- [x] Atribución CC BY-SA 4.0, licencia junto al modelo y crédito visible; sin piezas NC
- [x] Verificación: check, build, E2E de producción con CSP (incluye `wasm-unsafe-eval`)

## Fase 3 — IA, cuentas y premium ✅

- [x] Asistente que **solo explica** (`src/features/assistant`): glosario curado sin conexión que
      añade las razones del motor para tu semana; modelo local con WebLLM (Qwen2.5 1,5B/0,5B)
      en un Web Worker, descarga opcional y fuera del precache; respaldo en la nube opcional
- [x] Contexto del asistente remoto sin datos personales ni de salud (garantizado por tests);
      aviso sanitario automático ante preguntas de dolor; conversación solo en memoria
- [x] Supabase opcional (UE): esquema con RLS en todas las tablas, cuenta sin contraseña con
      enlace por email (o código, si algún día hay SMTP propio), sincronización mínima local-first testada (perfil sin lesiones,
      sesiones sin notas, logros), borrado de cuenta en un clic
- [x] Edge Functions: asistente con Gemini (cuota diaria por persona, clave solo en servidor)
      y borrado de cuenta; workflow que aplica migraciones y publica funciones
- [x] Arquitectura premium sin pagos: funciones por plan (todo lo actual gratis), plan leído
      del servidor (tabla solo escribible por el servidor), pantalla Forja+
- [x] Privacidad actualizada (cuenta, sincronización, asistente y condiciones de Gemini)
- [x] Proyecto de Supabase, clave de Gemini y secretos/variables en GitHub
      (pasos en `supabase/README.md`); app publicada en https://forja-13u.pages.dev
- [x] Workflow «Comprobación» (`scripts/smoke/production.ts`): tras cada despliegue, cada lunes
      y a mano prueba la web, Gemini, la configuración de Auth y la nube con un usuario temporal.
      20/20 en verde el 26/09/2026 (asistente con `gemini-3.5-flash-lite`)

## MagicErick ✅ (26/09/2026)

- [x] El asistente se llama **MagicErick** (nombre en la interfaz, en el glosario y en el
      prompt del modelo local y de la nube)
- [x] Ventana de chat flotante siempre a mano: botón en todas las pantallas con barra inferior
      y en la cabecera de la sesión en curso; hoja casi a pantalla completa en el móvil
      (ajustada al teclado) y ventana abajo a la derecha en el ordenador; la conversación se
      conserva al navegar. Desde un ejercicio se abre con ese ejercicio como tema
- [x] Arreglado el cuelgue en el móvil: los modelos locales necesitan 1-1,6 GB de memoria
      gráfica y el navegador perdía la GPU sin avisar. Ahora: en móviles y tabletas no se
      ofrecen (se usa la nube o el glosario y se pueden borrar los modelos ya descargados);
      en el ordenador hay prueba de arranque, límites de tiempo (45 s hasta la primera palabra,
      20 s entre palabras), detección de caída del worker y respaldo automático
- [x] La IA en la nube se ofrece siempre que esté configurada (antes solo sin WebGPU), con
      avisos en el chat para iniciar sesión o activarla

### Ideas para después

- [ ] Motor: con poco tiempo por sesión, cambiar series de accesorios por series de músculos
      por debajo del objetivo (p. ej. pecho con 3 días × 60 min)
- [ ] Series de aproximación registrables en la sesión
- [ ] Más idiomas (la estructura i18n ya lo permite)
- [ ] Pagos reales para Forja+ (webhook que escriba en `entitlements`), solo si algún día se
      decide y sin quitar nada gratuito
