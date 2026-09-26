/** Descanso legible: 90 → «1:30 min», 120 → «2 min», 45 → «45 s». */
export function formatRest(seconds: number) {
  if (seconds < 60) return `${seconds} s`
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return sec === 0 ? `${min} min` : `${min}:${String(sec).padStart(2, '0')} min`
}

/** Cronómetro: 75 → «1:15», 3725 → «1:02:05». */
export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Kilos con coma decimal y sin ceros sobrantes: 62.5 → «62,5». */
export function formatKg(kg: number, locale = 'es') {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(kg)
}
