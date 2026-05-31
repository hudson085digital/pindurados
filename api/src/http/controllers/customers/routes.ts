import { FastifyInstance } from 'fastify'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { createCustomer } from './create'
import { fetchCustomers } from './fetch'
import { customerDetails } from './details'
import { updateCustomer } from './update'
import { deleteCustomer } from './delete'

export async function customersRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.post('/customers', createCustomer)
  app.get('/customers', fetchCustomers)
  app.get('/customers/:id', customerDetails)
  app.put('/customers/:id', updateCustomer)
  app.delete('/customers/:id', deleteCustomer)
}
