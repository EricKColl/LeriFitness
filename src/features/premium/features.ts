/**
 * Arquitectura premium (sin pagos reales). Qué necesita cada función: hoy TODO lo que existe es
 * gratis y seguirá siéndolo; «premium» queda preparado para ampliaciones futuras.
 *
 * El plan de cada persona lo decide el servidor (tabla `entitlements`, solo escribible con la
 * clave de servicio, p. ej. desde un webhook de pagos futuro). La app solo lo lee: nunca puede
 * concederse premium a sí misma. Los límites que importan (cuota del asistente en la nube) se
 * aplican en el servidor.
 */
export const PLANS = ['free', 'premium'] as const
export type Plan = (typeof PLANS)[number]

export const FEATURES = {
  planEngine: 'free',
  liveSession: 'free',
  progress: 'free',
  anatomy3d: 'free',
  localAssistant: 'free',
  cloudSync: 'free',
  cloudAssistant: 'free',
  // Preparadas para el futuro:
  cloudAssistantExtended: 'premium',
  advancedAnalytics: 'premium',
  customPrograms: 'premium',
} as const satisfies Record<string, Plan>
export type Feature = keyof typeof FEATURES

const RANK: Record<Plan, number> = { free: 0, premium: 1 }

export function canUse(feature: Feature, plan: Plan) {
  return RANK[plan] >= RANK[FEATURES[feature]]
}

export const FREE_FEATURES = (Object.keys(FEATURES) as Feature[]).filter(
  (f) => FEATURES[f] === 'free',
)
export const PREMIUM_FEATURES = (Object.keys(FEATURES) as Feature[]).filter(
  (f) => FEATURES[f] === 'premium',
)
