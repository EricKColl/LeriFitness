/** Versión de la app (de package.json), inyectada por Vite al compilar. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** URL del proyecto de Supabase (opcional: sin ella, la app funciona solo en local). */
  readonly VITE_SUPABASE_URL?: string
  /** Clave pública (anon) de Supabase. Es pública por diseño: la seguridad la da RLS. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}
