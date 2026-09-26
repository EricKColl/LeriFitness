import { statSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import anatomy from '@/data/generated/anatomy.json'
import { INJURY_ZONES, MUSCLES } from '@/domain'

describe('modelo anatómico 3D', () => {
  it('tiene un nodo por cada grupo muscular del dominio, más el resto y el esqueleto', () => {
    for (const m of MUSCLES) expect(anatomy.nodes).toContain(`m:${m}:l`)
    expect(anatomy.nodes).toContain('m:other:l')
    expect(anatomy.nodes).toContain('b:skeleton:l')
    expect(anatomy.nodes).toContain('b:skeleton:c')
  })

  it('tiene un ancla por cada zona de lesión', () => {
    const anchors = anatomy.anchors as Record<string, { c?: number[]; l?: number[] }>
    for (const zone of INJURY_ZONES) {
      const anchor = anchors[zone]
      expect(anchor?.c ?? anchor?.l, zone).toHaveLength(3)
    }
    // El lado izquierdo está en x positivas y el cuerpo mide unos 1,7 m (Y arriba).
    expect(anchors.knee?.l?.[0]).toBeGreaterThan(0)
    expect(anchors.neck?.c?.[1]).toBeGreaterThan(1.3)
    expect(anchors.ankle?.l?.[1]).toBeLessThan(0.15)
  })

  it('el archivo publicado existe y pesa poco', () => {
    const bytes = statSync(`public/${anatomy.model.path}`).size
    expect(bytes).toBe(anatomy.model.bytes)
    expect(bytes).toBeLessThan(1.5 * 1024 * 1024)
  })
})
