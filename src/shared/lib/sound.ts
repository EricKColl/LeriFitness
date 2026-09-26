let ctx: AudioContext | null = null

/**
 * Pitido corto con Web Audio (sin archivos de audio). El contexto se crea en el primer gesto del
 * usuario (p. ej. al pulsar «Serie hecha») para que el navegador lo permita después.
 */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

export function beep({ frequency = 880, duration = 0.18, repeat = 2 } = {}) {
  if (!ctx) return
  const start = ctx.currentTime
  for (let i = 0; i < repeat; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const t = start + i * (duration + 0.1)
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }
}

export function vibrate(pattern: number | number[]) {
  navigator.vibrate?.(pattern)
}
