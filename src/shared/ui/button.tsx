import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-[transform,background-color,box-shadow,opacity] duration-200 ease-forge outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.15em]",
  {
    variants: {
      variant: {
        default:
          'bg-ember-gradient text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.35),0_8px_24px_-10px_var(--ember)] hover:brightness-105',
        solid: 'bg-foreground text-background hover:bg-foreground/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/30',
        outline:
          'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground dark:border-input',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/75',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        steel: 'bg-steel-soft text-steel hover:brightness-110',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-12 px-5 has-[>svg]:px-4',
        xs: 'h-7 gap-1 rounded-lg px-2.5 text-xs',
        sm: 'h-9 gap-1.5 rounded-xl px-3.5',
        lg: 'h-14 rounded-2xl px-7 text-base',
        xl: 'h-16 rounded-3xl px-8 text-lg',
        icon: 'size-12',
        'icon-sm': 'size-9 rounded-xl',
        'icon-lg': 'size-14',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
