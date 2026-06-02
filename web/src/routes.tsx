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

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Protected>
        <AppLayout />
      </Protected>
    ),
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/devedores', element: <Customers /> },
      { path: '/devedores/:id', element: <CustomerDetails /> },
      { path: '/nova-venda', element: <NewSale /> },
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
