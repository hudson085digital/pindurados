import { FastifyInstance } from 'fastify'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { summary } from './summary'
import { dashboard } from './dashboard'
import { pending } from './pending'

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.get('/reports/summary', summary)
  app.get('/reports/dashboard', dashboard)
  app.get('/reports/pending', pending)
}
