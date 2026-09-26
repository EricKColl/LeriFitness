import { RouterProvider } from 'react-router/dom'

import { TooltipProvider } from '@/shared/ui/tooltip'

import { router } from './router'

export function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <RouterProvider router={router} />
    </TooltipProvider>
  )
}
