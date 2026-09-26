// Punto de entrada perezoso de WebLLM (~6 MB): solo se descarga al activar el asistente local.
// Al tener nombre propio, el service worker lo excluye del precache (ver scripts/build/pwa.ts).
export {
  CreateWebWorkerMLCEngine,
  deleteModelAllInfoInCache,
  hasModelInCache,
} from '@mlc-ai/web-llm'
