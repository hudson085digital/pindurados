import { FastifyInstance } from 'fastify'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { markLate } from './mark-late'
import { unmarkLate } from './unmark-late'

export async function installmentsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.post('/installments/:id/late', markLate)
  app.delete('/installments/:id/late', unmarkLate)
}
