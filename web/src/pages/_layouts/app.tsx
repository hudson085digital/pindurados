import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Store,
  KeyRound,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'

const navItems = [
  { to: '/', label: 'Resumo', icon: LayoutDashboard, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users, end: false },
  { to: '/nova-venda', label: 'Nova venda', icon: PlusCircle, end: false },
  { to: '/loja', label: 'Loja', icon: Store, end: false },
  { to: '/chaves-pix', label: 'Pix', icon: KeyRound, end: false },
]

// Layout desktop-first: sidebar fixa com a marca (gradiente) + conteúdo largo.
// Em telas pequenas a sidebar dá lugar ao bottom nav (fallback de balcão).
export function AppLayout() {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('pindurados.token')
    navigate('/sign-in', { replace: true })
  }

  return (
    <div className="min-h-[100dvh] md:flex">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-brand-gradient md:flex">
        <div className="flex h-16 items-center px-5">
          <Logo onBrand />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
                  isActive
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/75 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between px-3 py-4">
          <ThemeToggle className="text-white/85 hover:bg-white/15 hover:text-white focus-visible:ring-white/80 focus-visible:ring-offset-0" />
          <button
            onClick={handleLogout}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Topo (mobile) */}
      <header className="sticky top-0 z-30 bg-brand-gradient shadow-md md:hidden">
        <div className="container flex h-14 items-center justify-between">
          <Logo onBrand />
          <div className="flex items-center gap-0.5">
            <ThemeToggle className="text-white/85 hover:bg-white/15 hover:text-white focus-visible:ring-white/80 focus-visible:ring-offset-0" />
            <button
              onClick={handleLogout}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="min-w-0 flex-1 md:ml-60">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-10">
          <Outlet />
        </div>
      </main>

      {/* Navegação inferior (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/85 md:hidden">
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
