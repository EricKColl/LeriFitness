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

## Fase 1 — MVP ✅ (pendiente solo de datos del responsable y de publicar)

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
- [ ] **Datos del responsable del tratamiento** en `src/config/legal.ts` (los aporta la persona
      titular)
- [ ] Crear la cuenta gratuita de Cloudflare y los secretos del repositorio para publicar

### Mejoras detectadas para más adelante

- [ ] Motor: con poco tiempo por sesión, cambiar series de accesorios por series de músculos
      por debajo del objetivo (p. ej. pecho con 3 días × 60 min)
- [ ] Series de aproximación registrables en la sesión (hoy solo se muestran como guía)
- [ ] Más idiomas (la estructura i18n ya lo permite)

## Fase 2 — Anatomía 3D

- [ ] Pipeline del modelo (Z-Anatomy/BodyParts3D → músculos + esqueleto → glTF Draco/Meshopt)
- [ ] Visor React Three Fiber: músculos por ejercicio, mapa de calor semanal, zonas lesionadas
- [ ] Atribución CC BY-SA 4.0 y publicación del modelo derivado con la misma licencia

## Fase 3 — IA y cuentas

- [ ] Asistente: WebLLM con WebGPU; respaldo Gemini (plan gratuito) vía Edge Function con cuota
- [ ] Cuentas opcionales y sincronización con Supabase (UE, RLS)
- [ ] Funciones premium (Stripe o Lemon Squeezy)
