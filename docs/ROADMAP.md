# Roadmap y lista de tareas

## Fase 0 — Cimientos

- [x] Proyecto Vite + React 19 + TypeScript estricto
- [x] Estructura por features, alias `@/`
- [x] ESLint (type-checked, reglas de pureza del motor), Prettier, EditorConfig
- [x] Vitest + Testing Library + fake-indexeddb
- [x] Tailwind 4 + shadcn/ui + Motion; tokens de diseño claro/oscuro
- [x] Marca: nombre, símbolo, paleta, tipografía (`docs/BRAND.md`)
- [x] Iconos PWA generados por script

## Fase 1 — MVP

- [ ] Base de ejercicios: pipeline reproducible (descarga fijada, normalización, etiquetas, WebP)
- [ ] Contenido en español de los 873 ejercicios (nombres, pasos, errores comunes)
- [ ] Vocabulario de dominio: músculos, material, lesiones, patrones de movimiento
- [ ] Motor de planes (volumen, split, reps/descansos, progresión, descargas, trabajo, lesiones) + tests
- [ ] Capa de datos local (Dexie) + exportar/borrar en un clic
- [ ] Onboarding con consentimiento explícito y avisos
- [ ] Pantalla «Hoy», plan semanal y ajuste semana a semana
- [ ] Biblioteca de ejercicios con buscador, filtros y ficha
- [ ] Sesión en vivo: registro de series, temporizador de descanso, sustituciones
- [ ] Progreso: gráficas, medidas, historial, mapa muscular 2D de volumen
- [ ] Logros, rachas y mensajes de motivación con animaciones
- [ ] Legal: privacidad, términos, atribuciones
- [ ] PWA offline + aviso de actualización
- [ ] CI (GitHub Actions) y despliegue en Cloudflare Pages

## Fase 2 — Anatomía 3D

- [ ] Pipeline del modelo (Z-Anatomy/BodyParts3D → músculos + esqueleto → glTF Draco/Meshopt)
- [ ] Visor React Three Fiber: músculos por ejercicio, mapa de calor semanal, zonas lesionadas
- [ ] Atribución CC BY-SA 4.0 y publicación del modelo derivado con la misma licencia

## Fase 3 — IA y cuentas

- [ ] Asistente: WebLLM con WebGPU; respaldo Gemini (plan gratuito) vía Edge Function con cuota
- [ ] Cuentas opcionales y sincronización con Supabase (UE, RLS)
- [ ] Funciones premium (Stripe o Lemon Squeezy)
