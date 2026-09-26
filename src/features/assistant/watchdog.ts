/**
 * Límites de tiempo para el modelo local. En muchos móviles la GPU se queda sin memoria a mitad
 * de una respuesta y el navegador deja la petición colgada sin avisar: sin estos límites el chat
 * se quedaría «pensando» para siempre.
 */
export class TimeoutError extends Error {
  constructor(what: string) {
    super(`Tiempo agotado: ${what}`)
    this.name = 'TimeoutError'
  }
}

/** La promesa, o un error si tarda más de `ms` (o si falla `abort`, p. ej. el worker cae). */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  what: string,
  abort?: Promise<never>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(what)), ms)
  })
  return Promise.race([promise, timeout, ...(abort ? [abort] : [])]).finally(() =>
    clearTimeout(timer),
  )
}

/**
 * Temporizador de inactividad: `expired` falla si pasan `ms` sin llamar a `kick` (sirve para una
 * descarga larga que avanza, pero que no debe quedarse parada).
 */
export function idleTimeout(ms: number, what: string) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let fail: (error: Error) => void = () => {}
  const expired = new Promise<never>((_, reject) => {
    fail = reject
  })
  expired.catch(() => {})
  const kick = () => {
    clearTimeout(timer)
    timer = setTimeout(() => fail(new TimeoutError(what)), ms)
  }
  kick()
  return { expired, kick, stop: () => clearTimeout(timer) }
}

/** Promesa que falla con `AbortError` cuando se aborta la señal (p. ej. al pulsar «Detener»). */
export function aborted(signal: AbortSignal): Promise<never> {
  const promise = new Promise<never>((_, reject) => {
    const fail = () => reject(new DOMException('Detenido', 'AbortError'))
    if (signal.aborted) fail()
    else signal.addEventListener('abort', fail, { once: true })
  })
  promise.catch(() => {})
  return promise
}

export const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError'

/**
 * Recorre un flujo de fragmentos exigiendo que el primero llegue antes de `firstMs` y cada uno
 * de los siguientes antes de `idleMs`.
 */
export async function* guardStream<T>(
  source: AsyncIterable<T>,
  { firstMs, idleMs, abort }: { firstMs: number; idleMs: number; abort?: Promise<never> },
): AsyncGenerator<T> {
  const iterator = source[Symbol.asyncIterator]()
  let first = true
  while (true) {
    const next = await withTimeout(
      iterator.next(),
      first ? firstMs : idleMs,
      first ? 'primera palabra' : 'siguiente palabra',
      abort,
    )
    if (next.done) return
    first = false
    yield next.value
  }
}
