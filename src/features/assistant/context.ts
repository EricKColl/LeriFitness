/**
 * Contexto que se da al modelo de lenguaje para que explique TU plan. Es texto ya traducido.
 *
 * Privacidad: con el modelo local (todo en el dispositivo) se puede incluir lo relacionado con
 * molestias si hay consentimiento de salud. Con el asistente remoto NUNCA se envían datos de
 * salud ni personales (edad, sexo, peso, trabajo, gasto energético, lesiones o molestias).
 */
import { searchKnowledge } from './knowledge'

export type AssistantTarget = 'local' | 'remote'

export interface ContextReason {
  /** Clave del motor (p. ej. `reasons.injury.filtered`). */
  key: string
  text: string
}

export interface ContextInput {
  goal: string
  level: string
  split: string
  week: string
  days: { name: string; exercises: string[] }[]
  reasons: ContextReason[]
  exercise?: { name: string; steps: string[]; muscles: string }
  healthConsent: boolean
}

/** Razones del motor que revelan o derivan de datos de salud o personales. */
const PRIVATE_REASONS = [
  'reasons.injury.',
  'reasons.adapt.temporaryPain',
  'warnings.consultProfessional',
  'reasons.volume.age',
  'reasons.volume.physicalJob',
  'reasons.volume.sedentaryJob',
]

export function isPrivateReason(key: string) {
  return PRIVATE_REASONS.some((prefix) => key.startsWith(prefix))
}

export function buildContext(input: ContextInput, target: AssistantTarget, question: string) {
  const allowPrivate = target === 'local' && input.healthConsent
  const lines = [
    `Objetivo: ${input.goal}. Nivel: ${input.level}.`,
    `Esquema: ${input.split}. ${input.week}.`,
    'Sesiones de la semana:',
    ...input.days.map((d) => `- ${d.name}: ${d.exercises.join(', ')}`),
  ]
  const reasons = input.reasons.filter((r) => allowPrivate || !isPrivateReason(r.key))
  if (reasons.length) lines.push('Por qué el plan es así:', ...reasons.map((r) => `- ${r.text}`))
  if (input.exercise)
    lines.push(
      `Ejercicio consultado: ${input.exercise.name} (músculos: ${input.exercise.muscles}).`,
      ...input.exercise.steps.map((s, i) => `${i + 1}. ${s}`),
    )
  const knowledge = searchKnowledge(question)
  if (knowledge.length)
    lines.push(
      'Conocimiento de referencia:',
      ...knowledge.map((k) => `- ${k.entry.title}: ${k.entry.body}`),
    )
  return lines.join('\n')
}

export const SYSTEM_PROMPT = `Eres el asistente de Forja, una app de entrenamiento de fuerza. Respondes en español, con frases claras y breves (máximo 120 palabras), con un tono cercano y respetuoso, sin asumir el género de la persona.

Tu función es SOLO explicar: por qué el plan es como es, qué significan los términos de entrenamiento y cómo hacer los ejercicios. Reglas estrictas:
- No cambias el plan ni propones otro: el plan lo calcula un motor de reglas. Si piden cambios, explica que pueden ajustar su perfil (días, tiempo, material, molestias) y el plan se recalculará.
- No das consejo médico, diagnósticos, tratamientos ni dietas. Ante dolor, lesión o síntomas, recomienda parar y consultar con un profesional sanitario.
- Usa el contexto proporcionado; si algo no está en él y no lo sabes con seguridad, dilo.
- No inventes cifras sobre la persona.`

/** Razones del plan que explican una entrada del glosario (respetando la privacidad local). */
export function planReasonsFor(prefixes: readonly string[], input: ContextInput) {
  return input.reasons
    .filter((r) => prefixes.some((p) => r.key.startsWith(p)))
    .filter((r) => input.healthConsent || !isPrivateReason(r.key))
    .map((r) => r.text)
}
