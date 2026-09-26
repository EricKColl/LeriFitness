import { useEffect, useState } from 'react'

/** Hora actual que se refresca cada `intervalMs` mientras `active` sea cierto. */
export function useNow(active = true, intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const tick = () => setNow(Date.now())
    tick()
    const timer = setInterval(tick, intervalMs)
    return () => clearInterval(timer)
  }, [active, intervalMs])
  return now
}
