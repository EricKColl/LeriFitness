import { VitePWA } from 'vite-plugin-pwa'

/**
 * Configuración PWA: app shell y datos precacheados (funciona 100 % sin conexión);
 * las imágenes de ejercicios se cachean bajo demanda y al generar el plan.
 */
export function pwaPlugin() {
  return VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
    manifest: {
      id: '/',
      name: 'Forja — Entrenamiento personalizado',
      short_name: 'Forja',
      description:
        'Entrenamiento de gimnasio personalizado y basado en ciencia. Funciona sin conexión; tus datos se quedan en tu dispositivo.',
      lang: 'es',
      dir: 'ltr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0f0d0c',
      theme_color: '#0f0d0c',
      categories: ['health', 'fitness', 'sports'],
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,glb}', '**/*-latin-*.woff2'],
      // WebLLM (~6 MB) solo se descarga si se activa el asistente local; entonces se cachea.
      globIgnores: ['exercises/**', '**/webllm-*.js', '**/llm.worker-*.js'],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      navigateFallback: 'index.html',
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          urlPattern: ({ url }) => /\/assets\/(webllm|llm\.worker)-.*\.js$/.test(url.pathname),
          handler: 'CacheFirst',
          options: {
            cacheName: 'assistant-runtime',
            expiration: { maxEntries: 6 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/exercises/'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'exercise-images',
            expiration: { maxEntries: 2500, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    devOptions: { enabled: false },
  })
}
