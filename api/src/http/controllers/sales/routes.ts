import { FastifyInstance } from 'fastify'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { calculate } from './calculate'
import { createSale } from './create'
import { saleDetails } from './details'
import { deleteSale } from './delete'

export async function salesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.post('/sales/calculate', calculate)
  app.post('/sales', createSale)
  app.get('/sales/:id', saleDetails)
  app.delete('/sales/:id', deleteSale)
}
