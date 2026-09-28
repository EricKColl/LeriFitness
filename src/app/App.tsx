import { RouterProvider } from 'react-router/dom'
import { Toaster } from 'sonner'

import { useResolvedTheme } from '@/shared/stores/theme'
import { TooltipProvider } from '@/shared/ui/tooltip'

import { OfflineBanner, UpdatePrompt } from './layout/pwa'
import { router } from './router'

export function App() {
  const theme = useResolvedTheme()
  return (
    <TooltipProvider delayDuration={300}>
      <RouterProvider router={router} />
      <OfflineBanner />
      <UpdatePrompt />
      <Toaster
        position="top-center"
        theme={theme}
        offset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
        toastOptions={{
          classNames: {
            toast: '!rounded-2xl !border-border !bg-popover !text-popover-foreground !shadow-xl',
            description: '!text-muted-foreground',
            actionButton: '!bg-primary !text-primary-foreground !rounded-xl !font-semibold',
          },
        }}
      />
    </TooltipProvider>
  )
}
