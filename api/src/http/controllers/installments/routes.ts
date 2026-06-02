import { FastifyInstance } from 'fastify'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { markLate } from './mark-late'
import { unmarkLate } from './unmark-late'
import { updateDueDate } from './update-due-date'

export async function installmentsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.post('/installments/:id/late', markLate)
  app.delete('/installments/:id/late', unmarkLate)
  app.patch('/installments/:id/due-date', updateDueDate)
}
