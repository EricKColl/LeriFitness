import { useEffect, useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import type { Exercise } from '@/domain'
import { exerciseImage } from '@/data/catalog'
import { cn } from '@/shared/lib/utils'

/** Miniatura de un ejercicio (primer fotograma) con carga perezosa y reserva si falla. */
export function ExerciseThumb({
  exercise,
  className,
}: {
  exercise: Pick<Exercise, 'images'> | undefined
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const src = exercise?.images[0]
  return (
    <div
      className={cn(
        'grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/95 ring-1 ring-border',
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={exerciseImage(src)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <Dumbbell className="size-1/2 text-muted-foreground" aria-hidden />
      )}
    </div>
  )
}

/**
 * Las dos posiciones del ejercicio en bucle con fundido cruzado (inicio → final). Con movimiento
 * reducido se muestran las dos imágenes estáticas lado a lado.
 */
export function ExerciseFrames({ exercise, alt }: { exercise: Exercise; alt: string }) {
  const reduced = useReducedMotion()
  const [frame, setFrame] = useState(0)
  const count = exercise.images.length

  useEffect(() => {
    if (reduced || count < 2) return
    const timer = setInterval(() => setFrame((f) => (f + 1) % count), 1400)
    return () => clearInterval(timer)
  }, [reduced, count])

  if (reduced && count > 1)
    return (
      <div className="grid grid-cols-2 gap-2">
        {exercise.images.map((img, i) => (
          <img
            key={img}
            src={exerciseImage(img)}
            alt={i === 0 ? alt : ''}
            className="aspect-[4/3] w-full rounded-2xl bg-white object-contain"
          />
        ))}
      </div>
    )

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-white ring-1 ring-border">
      <AnimatePresence initial={false}>
        <motion.img
          key={frame}
          src={exerciseImage(exercise.images[frame] ?? exercise.images[0]!)}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0 size-full object-contain"
        />
      </AnimatePresence>
      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden>
          {exercise.images.map((img, i) => (
            <span
              key={img}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === frame ? 'w-5 bg-primary' : 'w-1.5 bg-black/25',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
