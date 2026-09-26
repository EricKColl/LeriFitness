import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { SYSTEM_PROMPT } from '@/features/assistant/context'

describe('Supabase', () => {
  it('la función del asistente usa exactamente las mismas reglas que la app', () => {
    const server = readFileSync('supabase/functions/_shared/prompt.ts', 'utf8')
    expect(server).toContain(SYSTEM_PROMPT)
  })

  it('todas las tablas tienen RLS activado', () => {
    const sql = readFileSync('supabase/migrations/20260926120000_forja_init.sql', 'utf8')
    const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1])
    expect(tables.length).toBeGreaterThan(0)
    for (const table of tables)
      expect(sql).toContain(`alter table public.${table} enable row level security`)
  })

  it('nunca se sincronizan colecciones con datos de salud', () => {
    const sql = readFileSync('supabase/migrations/20260926120000_forja_init.sql', 'utf8')
    const allowed = /collection in \(([^)]*)\)/.exec(sql)?.[1] ?? ''
    for (const health of ['checkIns', 'measurements', 'consents'])
      expect(allowed).not.toContain(health)
  })
})
