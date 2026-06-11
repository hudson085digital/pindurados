import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, PlusCircle, KeyRound, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'

const navItems = [
  { to: '/', label: 'Resumo', icon: LayoutDashboard, end: true },
  { to: '/devedores', label: 'Devedores', icon: Users, end: false },
  { to: '/nova-venda', label: 'Nova venda', icon: PlusCircle, end: false },
  { to: '/chaves-pix', label: 'Pix', icon: KeyRound, end: false },
]

export function AppLayout() {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('pindurados.token')
    navigate('/sign-in', { replace: true })
  }

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-14 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="container py-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      {/* Navegação inferior (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="container flex justify-around gap-1 py-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
