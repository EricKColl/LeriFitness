import { afterEach, describe, expect, it, vi } from 'vitest'

import { isMobileDevice } from './device'
import { engineHint, pickEngine } from './engine'
import { searchKnowledge } from './knowledge'
import { aborted, guardStream, isAbortError, TimeoutError, withTimeout } from './watchdog'

const UA = {
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
}

/** Flujo que entrega los fragmentos con las esperas indicadas (ms). */
async function* slow(delays: number[]) {
  for (const [i, ms] of delays.entries()) {
    await new Promise((resolve) => setTimeout(resolve, ms))
    yield `t${i}`
  }
}

async function collect(stream: AsyncIterable<string>) {
  const out: string[] = []
  for await (const chunk of stream) out.push(chunk)
  return out
}

afterEach(() => {
  vi.useRealTimers()
})

describe('MagicErick: dispositivo', () => {
  it('reconoce móviles y tabletas (también el iPad que se presenta como Mac)', () => {
    expect(isMobileDevice({ userAgent: UA.android })).toBe(true)
    expect(isMobileDevice({ userAgent: UA.iphone })).toBe(true)
    expect(isMobileDevice({ userAgent: UA.mac, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(
      true,
    )
    expect(isMobileDevice({ userAgent: UA.windows, userAgentData: { mobile: true } })).toBe(true)
  })

  it('no confunde un ordenador con un móvil', () => {
    expect(isMobileDevice({ userAgent: UA.mac, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(
      false,
    )
    expect(isMobileDevice({ userAgent: UA.windows, userAgentData: { mobile: false } })).toBe(false)
  })
})

describe('MagicErick: quién responde', () => {
  it('prefiere el dispositivo, después la nube y, si no, el glosario', () => {
    expect(pickEngine('ready', 'on')).toBe('local')
    expect(pickEngine('mobile', 'on')).toBe('remote')
    expect(pickEngine('error', 'on')).toBe('remote')
    expect(pickEngine('mobile', 'signedOut')).toBe('glossary')
    expect(pickEngine('loading', 'off')).toBe('glossary')
  })

  it('en el móvil sin IA sugiere iniciar sesión o activar la nube', () => {
    expect(engineHint('mobile', 'signedOut')).toBe('signIn')
    expect(engineHint('mobile', 'off')).toBe('enableCloud')
    expect(engineHint('mobile', 'on')).toBeNull()
    expect(engineHint('mobile', 'unconfigured')).toBeNull()
  })

  it('en el ordenador sugiere descargar la IA o muestra el progreso', () => {
    expect(engineHint('notDownloaded', 'unconfigured')).toBe('download')
    expect(engineHint('notDownloaded', 'off')).toBe('enableCloud')
    expect(engineHint('downloading', 'signedOut')).toBe('progress')
    expect(engineHint('ready', 'off')).toBeNull()
  })

  it('el glosario sabe quién es MagicErick', () => {
    expect(searchKnowledge('¿Quién eres?')[0]?.entry.id).toBe('magicerick')
    expect(searchKnowledge('hola magicerick, ¿qué puedes hacer?')[0]?.entry.id).toBe('magicerick')
  })
})

describe('MagicErick: límites de tiempo del modelo local', () => {
  it('deja pasar una respuesta que llega a tiempo', async () => {
    await expect(withTimeout(Promise.resolve(42), 100, 'x')).resolves.toBe(42)
    await expect(
      collect(guardStream(slow([5, 5, 5]), { firstMs: 100, idleMs: 100 })),
    ).resolves.toEqual(['t0', 't1', 't2'])
  })

  it('corta si la primera palabra no llega (el cuelgue típico del móvil)', async () => {
    vi.useFakeTimers()
    const result = collect(guardStream(slow([60_000]), { firstMs: 45_000, idleMs: 20_000 }))
    const check = expect(result).rejects.toBeInstanceOf(TimeoutError)
    await vi.advanceTimersByTimeAsync(45_001)
    await check
  })

  it('corta si la respuesta se queda parada a mitad', async () => {
    vi.useFakeTimers()
    const result = collect(
      guardStream(slow([1_000, 1_000, 30_000]), { firstMs: 45_000, idleMs: 20_000 }),
    )
    const check = expect(result).rejects.toBeInstanceOf(TimeoutError)
    await vi.advanceTimersByTimeAsync(22_001)
    await check
  })

  it('corta al instante si el modelo cae o se pulsa «Detener»', async () => {
    const controller = new AbortController()
    const result = collect(
      guardStream(slow([60_000]), {
        firstMs: 45_000,
        idleMs: 20_000,
        abort: aborted(controller.signal),
      }),
    )
    controller.abort()
    const error = await result.catch((e: unknown) => e)
    expect(isAbortError(error)).toBe(true)
  })
})
