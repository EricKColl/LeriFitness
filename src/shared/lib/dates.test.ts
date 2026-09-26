import { describe, expect, it } from 'vitest'

import { addDays, isInWeek, weekdayOf, weeksBetween, weekStartOf } from './dates'

describe('fechas locales', () => {
  it('la semana empieza en lunes', () => {
    // 26/09/2026 es sábado
    expect(weekdayOf('2026-09-26')).toBe(5)
    expect(weekStartOf('2026-09-26')).toBe('2026-09-21')
    expect(weekStartOf('2026-09-21')).toBe('2026-09-21')
    expect(weekStartOf('2026-09-27')).toBe('2026-09-21')
  })

  it('suma días cruzando meses y el cambio de hora', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })

  it('cuenta semanas y comprueba pertenencia', () => {
    expect(weeksBetween('2026-09-07', '2026-09-21')).toBe(2)
    expect(isInWeek('2026-09-27', '2026-09-21')).toBe(true)
    expect(isInWeek('2026-09-28', '2026-09-21')).toBe(false)
  })
})
