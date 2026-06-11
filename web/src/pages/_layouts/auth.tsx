import { Outlet } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function AuthLayout() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center p-4">
      {/* Brilho emerald discreto ao fundo — calmo, não decorativo demais. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/10 to-transparent"
      />
      <div className="absolute right-3 top-3">
        <ThemeToggle />
      </div>
      <Outlet />
    </div>
  )
}
