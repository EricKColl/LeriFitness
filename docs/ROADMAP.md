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

## Fase 1 — MVP (en curso)

- [x] Vocabulario de dominio: músculos, material, lesiones, patrones, niveles (`src/domain`)
- [x] Esquemas Zod del catálogo y del contenido traducible
- [x] Pipeline reproducible: origen fijado + copia versionada, normalización, inferencia de
      patrón / estrés articular / material / unilateralidad, correcciones curadas, alternativas
- [x] Imágenes WebP (1746, 640 px, ~20 KB) en `public/exercises/`
- [x] Tests de integridad del catálogo y de la normalización
- [ ] Contenido en español: **300 de 873** redactados (`scripts/exercises/content/es/01-06.json`)
- [ ] Textos de errores comunes por patrón (i18n) para ejercicios sin errores específicos
- [ ] Motor de planes (volumen, split, reps/descansos, progresión, descargas, trabajo, lesiones,
      tiempo disponible) + tests exhaustivos
- [ ] Capa de datos local (Dexie) + exportar/borrar en un clic
- [ ] App shell: router, layout con barra inferior, tema, i18n
- [ ] Onboarding con consentimiento explícito y avisos
- [ ] Pantalla «Hoy», plan semanal y ajuste semana a semana
- [ ] Biblioteca de ejercicios con buscador, filtros y ficha
- [ ] Sesión en vivo: registro de series, temporizador de descanso, sustituciones
- [ ] Progreso: gráficas, medidas, historial, mapa muscular 2D de volumen
- [ ] Logros, rachas y mensajes de motivación con animaciones
- [ ] Legal: privacidad, términos, atribuciones
- [ ] PWA offline completa + aviso de actualización + precarga de imágenes del plan
- [ ] CI (GitHub Actions) y despliegue en Cloudflare Pages

## Fase 2 — Anatomía 3D

- [ ] Pipeline del modelo (Z-Anatomy/BodyParts3D → músculos + esqueleto → glTF Draco/Meshopt)
- [ ] Visor React Three Fiber: músculos por ejercicio, mapa de calor semanal, zonas lesionadas
- [ ] Atribución CC BY-SA 4.0 y publicación del modelo derivado con la misma licencia

## Fase 3 — IA y cuentas

- [ ] Asistente: WebLLM con WebGPU; respaldo Gemini (plan gratuito) vía Edge Function con cuota
- [ ] Cuentas opcionales y sincronización con Supabase (UE, RLS)
- [ ] Funciones premium (Stripe o Lemon Squeezy)
