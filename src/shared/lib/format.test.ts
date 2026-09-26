import { describe, expect, it } from 'vitest'

import { formatClock, formatKg, formatRest } from './format'

describe('formato', () => {
  it('descansos', () => {
    expect(formatRest(45)).toBe('45 s')
    expect(formatRest(90)).toBe('1:30 min')
    expect(formatRest(180)).toBe('3 min')
  })
  it('cronómetro', () => {
    expect(formatClock(75)).toBe('1:15')
    expect(formatClock(3725)).toBe('1:02:05')
    expect(formatClock(-3)).toBe('0:00')
  })
  it('kilos', () => {
    expect(formatKg(62.5)).toBe('62,5')
    expect(formatKg(60)).toBe('60')
  })
})
