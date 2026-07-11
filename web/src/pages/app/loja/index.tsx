import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'

const SEGMENTS = [
  { to: '/loja/compras', label: 'Compras' },
  { to: '/loja/estoque', label: 'Estoque' },
  { to: '/loja/produtos', label: 'Produtos' },
]

// Hub da operação de loja (025): compras → estoque → produtos.
export function LojaLayout() {
  return (
    <div className="space-y-4">
      <PageHeader title="Loja" />

      <div className="grid grid-cols-3 gap-1 rounded-md bg-secondary p-1">
        {SEGMENTS.map((seg) => (
          <NavLink
            key={seg.to}
            to={seg.to}
            className={({ isActive }) =>
              cn(
                'flex min-h-[36px] items-center justify-center rounded-sm px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {seg.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  )
}
