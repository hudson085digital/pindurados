import { FastifyInstance } from 'fastify'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { createPixKey } from './create'
import { fetchPixKeys } from './fetch'
import { setDefaultPixKey } from './set-default'
import { deletePixKey } from './delete'

export async function pixKeysRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.get('/pix-keys', fetchPixKeys)
  app.post('/pix-keys', createPixKey)
  app.patch('/pix-keys/:id/default', setDefaultPixKey)
  app.delete('/pix-keys/:id', deletePixKey)
}
