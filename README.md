# Forja

**Entrena con criterio. Progresa con calor.**

Forja es una app de entrenamiento de gimnasio personalizado. Es una PWA _local-first_: funciona sin
conexión, se instala desde el navegador y los datos (incluidos los de salud) se quedan en tu
dispositivo.

El plan de entrenamiento lo genera un **motor de reglas determinista** (TypeScript puro, con tests),
basado en principios de entrenamiento con respaldo científico. Ninguna IA decide tu plan.

## Stack

| Área        | Elección                                                        |
| ----------- | --------------------------------------------------------------- |
| Frontend    | React 19 + TypeScript (estricto) + Vite                         |
| UI          | Tailwind CSS 4 + shadcn/ui (Radix) + Motion                     |
| Datos       | Dexie (IndexedDB) + Zustand, esquemas con Zod                   |
| PWA         | vite-plugin-pwa (Workbox), offline completo                     |
| Tests       | Vitest + Testing Library                                        |
| Hosting     | Cloudflare Pages (`*.pages.dev`) con CI/CD en GitHub Actions    |

## Comandos

```bash
npm install          # instala dependencias
npm run dev          # servidor de desarrollo en http://localhost:5173
npm run build        # compila la app a dist/
npm run preview      # sirve dist/ para probar la PWA
npm run check        # tipos + lint + formato + tests
npm run data:exercises  # regenera la base de ejercicios desde el origen
npm run icons        # regenera favicon e iconos PWA desde el logotipo
```

## Estructura

```
src/
  app/          arranque, router, layout y proveedores
  engine/       motor de planes (TS puro, sin React ni DOM) + tests
  domain/       vocabulario compartido: músculos, material, lesiones, patrones
  data/         Dexie, repositorios y base de ejercicios generada
  features/     una carpeta por funcionalidad (onboarding, plan, sesión, progreso…)
  shared/       componentes UI, hooks y utilidades
  i18n/         traducciones (es; preparado para ca y en)
scripts/        generación reproducible de datos e iconos
docs/           arquitectura, roadmap, marca y textos legales
```

Más detalle en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) y [docs/ROADMAP.md](docs/ROADMAP.md).

## Licencias y atribuciones

- Código: todos los derechos reservados por el autor del proyecto (pendiente de decidir licencia).
- Ejercicios e imágenes: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense, dominio público), traducidos y enriquecidos por Forja.
- Tipografías: Inter y Bricolage Grotesque (SIL Open Font License 1.1).
- Iconos: Lucide (ISC).
