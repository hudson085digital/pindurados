import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { router } from './routes'
import { queryClient } from './lib/react-query'
import { useResolvedTheme } from './lib/theme'
import { ConfirmProvider } from './components/ui/confirm-dialog'

export function App() {
  // Toasts seguem o tema efetivo do app (toggle manual incluso), não só o sistema.
  const theme = useResolvedTheme()

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <Toaster richColors position="top-center" theme={theme} closeButton />
        <RouterProvider router={router} />
      </ConfirmProvider>
    </QueryClientProvider>
  )
}
