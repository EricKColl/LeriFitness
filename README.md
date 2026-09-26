# Forja

**Entrena con criterio. Progresa con calor.**

Forja es una app de entrenamiento de gimnasio personalizado. Es una PWA _local-first_: funciona sin
conexión, se instala desde el navegador y los datos (incluidos los de salud) se quedan en tu
dispositivo.

El plan de entrenamiento lo genera un **motor de reglas determinista** (TypeScript puro, con tests),
basado en principios de entrenamiento con respaldo científico. Ninguna IA decide tu plan.

## Stack

| Área     | Elección                                                     |
| -------- | ------------------------------------------------------------ |
| Frontend | React 19 + TypeScript (estricto) + Vite                      |
| UI       | Tailwind CSS 4 + shadcn/ui (Radix) + Motion                  |
| Datos    | Dexie (IndexedDB) + Zustand, esquemas con Zod                |
| PWA      | vite-plugin-pwa (Workbox), offline completo                  |
| Tests    | Vitest + Testing Library                                     |
| Hosting  | Cloudflare Pages (`*.pages.dev`) con CI/CD en GitHub Actions |
| 3D       | three.js + React Three Fiber + drei (carga perezosa)         |
| IA       | Glosario propio + WebLLM en el dispositivo; Gemini opcional  |
| Nube     | Supabase opcional (UE, RLS), sin datos de salud              |

## Comandos

```bash
npm install          # instala dependencias
npm run dev          # servidor de desarrollo en http://localhost:5173
npm run build        # compila la app a dist/
npm run preview      # sirve dist/ para probar la PWA
npm run check        # tipos + lint + formato + tests
npm run data:exercises  # regenera la base de ejercicios desde el origen
npm run anatomy:build   # regenera el modelo 3D (necesita Python 3.11 y uv; ver scripts/anatomy)
npm run icons        # regenera favicon e iconos PWA desde el logotipo
npm run plan:preview -- 3 60 hypertrophy intermediate fullGym knee:mild  # plan de ejemplo en consola
```

En desarrollo, `window.forjaDev.seed()` (consola del navegador) crea un perfil con varias semanas de
historial para probar las pantallas. No existe en la build de producción.

## Despliegue (gratis, en Cloudflare Pages)

Cada push a `main` publica la app en `https://forja.pages.dev` (o el subdominio libre que
asigne Cloudflare) y cada pull request obtiene una URL de vista previa. Lo hace
`.github/workflows/deploy.yml`, que necesita dos secretos del repositorio:

1. Crea una cuenta gratuita en <https://dash.cloudflare.com/sign-up> (no pide tarjeta).
2. Copia tu **Account ID**: en el panel, menú _Workers & Pages_ › columna derecha, o en la URL
   (`dash.cloudflare.com/<ACCOUNT_ID>/…`).
3. Crea un token en <https://dash.cloudflare.com/profile/api-tokens> › _Create Token_ ›
   _Create Custom Token_ con el permiso **Account › Cloudflare Pages › Edit** y guárdalo.
4. En GitHub: _Settings › Secrets and variables › Actions › New repository secret_ y crea
   `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` con esos valores.
5. Vuelve a lanzar el workflow _Despliegue_ (pestaña _Actions_) o haz un push a `main`.

Sin los secretos, el workflow termina sin error y sin publicar. Las cabeceras de seguridad y caché
están en `public/_headers`.

## Nube opcional

Cuentas sin contraseña, sincronización entre dispositivos (sin datos de salud) y asistente en la
nube. Es opcional: sin configurarla, la app es 100 % local. Pasos en
[supabase/README.md](supabase/README.md).

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
- Modelo anatómico 3D (`public/anatomy/body.glb`): derivado de [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy) (CC BY-SA 4.0), basado en BodyParts3D (© DBCLS, CC BY-SA 2.1 JP). Se distribuye con la misma licencia CC BY-SA 4.0 (ver `public/anatomy/LICENSE.txt`).
- Tipografías: Inter y Bricolage Grotesque (SIL Open Font License 1.1).
- Iconos: Lucide (ISC).
