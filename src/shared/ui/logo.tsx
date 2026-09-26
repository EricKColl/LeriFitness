import { useId } from 'react'

import { LOGO_MARK_PATH } from '@/config/brand'
import { cn } from '@/shared/lib/utils'

export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const gradientId = useId()
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('size-8', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={gradientId} x1="0.2" y1="0" x2="0.75" y2="1">
          <stop offset="0" stopColor="var(--ember-hot)" />
          <stop offset="0.6" stopColor="var(--ember)" />
          <stop offset="1" stopColor="oklch(0.55 0.2 32)" />
        </linearGradient>
      </defs>
      <path d={LOGO_MARK_PATH} fill={`url(#${gradientId})`} fillRule="evenodd" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className="size-7" />
      <span className="font-display text-[1.35rem] leading-none font-extrabold tracking-tight">
        Forja
      </span>
    </span>
  )
}
