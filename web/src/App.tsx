import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { router } from './routes'
import { queryClient } from './lib/react-query'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-center" />
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
