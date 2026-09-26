import { useTranslation } from 'react-i18next'

import type { Reason } from '@/engine'

/** Traducción con clave dinámica (claves que produce el motor o que se construyen en tiempo de ejecución). */
export type DynamicT = (key: string, options?: Record<string, unknown>) => string

/** Parámetros de las razones que son claves de vocabulario y se traducen antes de interpolar. */
const PARAM_NAMESPACES: Record<string, string> = {
  level: 'domain:levels',
  goal: 'domain:goals',
  zone: 'domain:injuryZones',
  severity: 'domain:severities',
  pattern: 'domain:patterns',
  from: 'domain:patterns',
  to: 'domain:patterns',
  day: 'engine:days',
}

/**
 * Texto de una razón o aviso del motor. `exerciseName` resuelve los parámetros `exercise`;
 * `muscles` es una lista separada por comas que se traduce y se une.
 */
export function useReasonText(exerciseName?: (id: string) => string) {
  const { t, i18n } = useTranslation()
  const tr = t as unknown as DynamicT
  const list = new Intl.ListFormat(i18n.language, { type: 'conjunction' })
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
  return (reason: Reason) => {
    const params: Record<string, unknown> = {}
    for (const [name, value] of Object.entries(reason.params ?? {})) {
      const ns = PARAM_NAMESPACES[name]
      if (ns && typeof value === 'string') {
        const text = tr(`${ns}.${value}`)
        // Los nombres de día (Torso A) conservan mayúsculas; el vocabulario va en minúscula.
        params[name] = name === 'day' ? text : text.toLowerCase()
      } else if (name === 'exercise' && typeof value === 'string')
        params[name] = exerciseName?.(value) ?? value
      else if (name === 'muscles' && typeof value === 'string')
        params[name] = list.format(
          value.split(',').map((m) => tr(`domain:muscles.${m}`).toLowerCase()),
        )
      else params[name] = typeof value === 'number' ? number.format(value) : value
    }
    const text = tr(`engine:${reason.key}`, params)
    return text.charAt(0).toUpperCase() + text.slice(1)
  }
}

/** `t` para claves construidas en tiempo de ejecución (días del plan, músculos de datos…). */
export function useDynamicT() {
  const { t } = useTranslation()
  return t as unknown as DynamicT
}
