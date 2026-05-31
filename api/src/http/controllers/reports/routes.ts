import { FastifyInstance } from 'fastify'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { summary } from './summary'

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.get('/reports/summary', summary)
}
