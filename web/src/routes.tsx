import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './pages/_layouts/app'
import { AuthLayout } from './pages/_layouts/auth'
import { Protected } from './pages/_layouts/protected'
import { SignIn } from './pages/auth/sign-in'
import { Dashboard } from './pages/app/dashboard'
import { Customers } from './pages/app/customers'
import { CustomerDetails } from './pages/app/customer-details'
import { NewSale } from './pages/app/new-sale'

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
    ],
  },
  {
    path: '/',
    element: <AuthLayout />,
    children: [{ path: '/sign-in', element: <SignIn /> }],
  },
])
