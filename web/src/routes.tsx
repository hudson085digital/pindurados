import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './pages/_layouts/app'
import { AuthLayout } from './pages/_layouts/auth'
import { Protected } from './pages/_layouts/protected'
import { SignIn } from './pages/auth/sign-in'
import { SignUp } from './pages/auth/sign-up'
import { Dashboard } from './pages/app/dashboard'
import { Customers } from './pages/app/customers'
import { CustomerDetails } from './pages/app/customer-details'
import { NewSale } from './pages/app/new-sale'
import { PixKeys } from './pages/app/pix-keys'
import { Cadastros } from './pages/app/cadastros'
import { LojaLayout } from './pages/app/loja'
import { Compras } from './pages/app/loja/compras'
import { Estoque } from './pages/app/loja/estoque'
import { Produtos } from './pages/app/loja/produtos'
import { Navigate, useParams } from 'react-router-dom'
import { PublicSale } from './pages/public/public-sale'

export const router = createBrowserRouter([
  // Página pública do devedor (023) — FORA do guard de login e do layout do app.
  {
    path: '/p/:token',
    element: <PublicSale />,
  },
  {
    path: '/',
    element: (
      <Protected>
        <AppLayout />
      </Protected>
    ),
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/clientes', element: <Customers /> },
      { path: '/clientes/:id', element: <CustomerDetails /> },
      // rotas antigas: redireciona (rename devedor → cliente)
      { path: '/devedores', element: <Navigate to="/clientes" replace /> },
      { path: '/devedores/:id', element: <RedirectToCliente /> },
      { path: '/nova-venda', element: <NewSale /> },
      {
        path: '/loja',
        element: <LojaLayout />,
        children: [
          { index: true, element: <Navigate to="/loja/compras" replace /> },
          { path: 'compras', element: <Compras /> },
          { path: 'estoque', element: <Estoque /> },
          { path: 'produtos', element: <Produtos /> },
        ],
      },
      { path: '/cadastros', element: <Cadastros /> },
      { path: '/chaves-pix', element: <PixKeys /> },
    ],
  },
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { path: '/sign-in', element: <SignIn /> },
      { path: '/sign-up', element: <SignUp /> },
    ],
  },
])

// Redireciona /devedores/:id → /clientes/:id (rename de 11/07/2026).
function RedirectToCliente() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/clientes/${id}`} replace />
}
