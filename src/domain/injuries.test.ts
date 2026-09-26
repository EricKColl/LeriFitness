import { describe, expect, it } from 'vitest'

import { isContraindicated } from './injuries'

describe('isContraindicated', () => {
  it('sin estrés en la zona nunca está contraindicado', () => {
    expect(isContraindicated(undefined, 'severe')).toBe(false)
  })

  it('leve excluye solo la carga alta', () => {
    expect(isContraindicated('low', 'mild')).toBe(false)
    expect(isContraindicated('moderate', 'mild')).toBe(false)
    expect(isContraindicated('high', 'mild')).toBe(true)
  })

  it('moderada y fuerte solo permiten carga baja', () => {
    for (const severity of ['moderate', 'severe'] as const) {
      expect(isContraindicated('low', severity)).toBe(false)
      expect(isContraindicated('moderate', severity)).toBe(true)
      expect(isContraindicated('high', severity)).toBe(true)
    }
  })
})
