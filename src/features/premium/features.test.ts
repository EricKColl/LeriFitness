import { describe, expect, it } from 'vitest'

import { canUse, FEATURES, FREE_FEATURES, PREMIUM_FEATURES } from './features'

describe('funciones por plan', () => {
  it('todo lo que ya existe es gratis', () => {
    for (const f of [
      'planEngine',
      'liveSession',
      'progress',
      'anatomy3d',
      'localAssistant',
      'cloudSync',
    ] as const)
      expect(FEATURES[f]).toBe('free')
  })

  it('premium incluye todo lo gratuito', () => {
    for (const f of FREE_FEATURES) {
      expect(canUse(f, 'free')).toBe(true)
      expect(canUse(f, 'premium')).toBe(true)
    }
    for (const f of PREMIUM_FEATURES) {
      expect(canUse(f, 'free')).toBe(false)
      expect(canUse(f, 'premium')).toBe(true)
    }
  })
})
