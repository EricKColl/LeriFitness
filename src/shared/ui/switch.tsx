import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'

import { cn } from '@/shared/lib/utils'

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-transparent transition-colors outline-none after:absolute after:-inset-2 after:content-[""] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-6 rounded-full bg-background shadow-sm ring-0 transition-transform duration-200 ease-forge data-[state=checked]:translate-x-[1.3rem] data-[state=unchecked]:translate-x-0.5 dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
