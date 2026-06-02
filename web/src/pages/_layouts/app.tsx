import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, PlusCircle, KeyRound, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div className="min-h-screen pb-20">
      <header className="bg-primary text-primary-foreground">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-bold">📒 Pindurados</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm opacity-90 hover:opacity-100"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </header>

      <main className="container py-4">
        <Outlet />
      </main>

      {/* Navegação inferior (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card">
        <div className="container flex justify-around py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 text-xs',
                  isActive ? 'text-primary font-semibold' : 'text-muted-foreground',
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
