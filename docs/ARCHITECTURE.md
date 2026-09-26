# Arquitectura

## Principios

1. **Local-first.** Todo funciona sin red. IndexedDB (Dexie) es la fuente de verdad.
   Los datos de salud nunca salen del dispositivo salvo que el usuario active la
   sincronización (fase 3).
2. **Motor determinista y puro.** `src/engine` no importa React, DOM, Dexie ni nada de la UI
   (lo impone ESLint). Misma entrada → mismo plan. Todo el razonamiento está testado.
3. **Datos generados, no escritos a mano.** La base de ejercicios se construye con
   `npm run data:exercises` desde una versión fijada de free-exercise-db, y se valida con Zod.
4. **Features verticales.** Cada carpeta de `src/features` contiene sus pantallas,
   componentes y lógica de presentación.

## Capas

```
┌──────────── features/* (React) ────────────┐
│  pantallas · componentes · hooks de feature │
└───────┬─────────────────────────┬──────────┘
        │                         │
   data/ (Dexie, repos)     engine/ (TS puro)
        │                         │
        └──────── domain/ ────────┘   vocabulario y tipos compartidos
```

- `domain/`: músculos, material, zonas de lesión, patrones de movimiento, esquema Zod del
  ejercicio. Lo usan el motor, la UI y los scripts de datos.
- `engine/`: genera el plan a partir del perfil, el catálogo de ejercicios y el historial.
- `data/`: persistencia, carga perezosa del catálogo y repositorios.

## Base de ejercicios

`scripts/exercises/` descarga free-exercise-db en un commit fijado, normaliza músculos al
vocabulario propio, infiere patrón de movimiento, material y estrés articular, aplica
correcciones curadas, fusiona el contenido en español y convierte las imágenes a WebP.
Resultado: `src/data/generated/exercises.json` (+ contenido por idioma) e imágenes en
`public/exercises/`.

## PWA

Workbox precachea el app shell, las fuentes latinas y el catálogo. Las imágenes de ejercicios
se cachean bajo demanda y se precargan las del plan activo.
