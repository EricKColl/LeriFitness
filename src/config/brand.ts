/**
 * Identidad de marca centralizada. Cambiar el nombre de la app es cambiar este archivo
 * (y los textos de `public/` y del manifiesto en `scripts/build/pwa.ts`).
 */
export const BRAND = {
  name: 'Forja',
  tagline: 'Entrena con criterio. Progresa con calor.',
  description:
    'Entrenamiento de gimnasio personalizado, basado en principios con respaldo científico. Tus datos se quedan en tu dispositivo.',
  themeColorDark: '#0f0d0c',
  themeColorLight: '#f7f3ee',
} as const

/** Trazado del símbolo (viewBox 64×64): una llama con una «F» en negativo. */
export const LOGO_MARK_PATH =
  'M32 3C36.2 12.6 46.4 19.4 50.3 30.2C54 40.6 52 52 44.1 57.6C40.6 60 36.6 61 32 61C21 61 12 53 12 41.6C12 33.2 15.9 27.1 21.2 21.8C21.6 26.9 23.9 30.5 27.2 31.6C25.9 22.4 27.9 11.5 32 3ZM25 36.5V54.5H30.6V48.6H37.6V44.2H30.6V40.9H41.2V36.5Z'
