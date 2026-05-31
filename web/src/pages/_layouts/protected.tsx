import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

// Bloqueia rotas se não houver token salvo.
export function Protected({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('pindurados.token')
  if (!token) {
    return <Navigate to="/sign-in" replace />
  }
  return <>{children}</>
}
