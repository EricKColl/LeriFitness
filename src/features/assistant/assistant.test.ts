import { describe, expect, it } from 'vitest'

import { buildContext, isPrivateReason, type ContextInput } from './context'
import { KNOWLEDGE, mentionsHealth, searchKnowledge } from './knowledge'

const input: ContextInput = {
  goal: 'ganar músculo',
  level: 'intermedio',
  split: 'Torso / Pierna ×2',
  week: 'Semana 2 de 5',
  days: [{ name: 'Torso A', exercises: ['Press de banca con barra', 'Remo con barra'] }],
  reasons: [
    { key: 'reasons.split.upperLower', text: 'Con 4 días, torso y pierna dos veces.' },
    { key: 'reasons.injury.filtered', text: 'Rodilla (moderada): se evitan ejercicios.' },
    { key: 'warnings.consultProfessional', text: 'Tienes molestias en rodilla.' },
    { key: 'reasons.volume.age', text: 'A partir de los 60 años se reduce el volumen.' },
    { key: 'reasons.adapt.temporaryPain', text: 'Molestia en hombro esta semana.' },
  ],
  healthConsent: true,
}

describe('asistente', () => {
  it('nunca envía datos de salud ni personales al asistente remoto', () => {
    const remote = buildContext(input, 'remote', '¿por qué hago esto?')
    expect(remote).toContain('torso y pierna dos veces')
    for (const word of ['Rodilla', 'rodilla', 'hombro', '60 años'])
      expect(remote).not.toContain(word)
  })

  it('en local incluye las molestias solo con consentimiento de salud', () => {
    expect(buildContext(input, 'local', 'x')).toContain('Rodilla')
    expect(buildContext({ ...input, healthConsent: false }, 'local', 'x')).not.toContain('Rodilla')
  })

  it('clasifica las razones privadas', () => {
    expect(isPrivateReason('reasons.injury.filtered')).toBe(true)
    expect(isPrivateReason('reasons.scheme.hypertrophy')).toBe(false)
  })

  it('encuentra la entrada adecuada del glosario', () => {
    expect(searchKnowledge('¿Qué es el RIR?')[0]?.entry.id).toBe('rir')
    expect(searchKnowledge('¿por qué tengo semana de descarga?')[0]?.entry.id).toBe('deload')
    expect(searchKnowledge('cuándo debo subir el peso')[0]?.entry.id).toBe('doubleProgression')
    expect(searchKnowledge('cuantas series por musculo hago')[0]?.entry.id).toBe('volume')
    expect(searchKnowledge('xyz qwerty')).toEqual([])
  })

  it('detecta preguntas de salud', () => {
    expect(mentionsHealth('Me duele la rodilla al bajar')).toBe(true)
    expect(mentionsHealth('¿Qué es una superserie?')).toBe(false)
  })

  it('el glosario tiene ids únicos y textos con contenido', () => {
    expect(new Set(KNOWLEDGE.map((k) => k.id)).size).toBe(KNOWLEDGE.length)
    for (const k of KNOWLEDGE) expect(k.body.length).toBeGreaterThan(80)
  })
})

describe('glosario con tu plan', () => {
  it('añade las razones del motor de la entrada, sin las privadas si no hay consentimiento', async () => {
    const { planReasonsFor } = await import('./context')
    expect(planReasonsFor(['reasons.split.'], input)).toEqual([
      'Con 4 días, torso y pierna dos veces.',
    ])
    expect(planReasonsFor(['reasons.injury.'], { ...input, healthConsent: false })).toEqual([])
  })
})

describe('modelos locales', () => {
  it('existen en el catálogo de WebLLM, con y sin f16', async () => {
    const { prebuiltAppConfig } = await import('@mlc-ai/web-llm')
    const { LOCAL_MODELS, modelId } = await import('./local-llm')
    const ids = new Set(prebuiltAppConfig.model_list.map((m) => m.model_id))
    for (const size of Object.keys(LOCAL_MODELS) as (keyof typeof LOCAL_MODELS)[])
      for (const f16 of [true, false])
        expect(ids.has(modelId(size, f16)), modelId(size, f16)).toBe(true)
  })
})
