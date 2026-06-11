import { FastifyInstance } from 'fastify'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { register } from './register'
import { authenticate } from './authenticate'
import { profile } from './profile'
import { updateProfile } from './update-profile'
import { refresh } from './refresh'

export async function usersRoutes(app: FastifyInstance) {
  app.post('/users', register)
  app.post('/sessions', authenticate)
  app.patch('/token/refresh', refresh)

  app.get('/me', { onRequest: [verifyJwt] }, profile)
  app.patch('/me', { onRequest: [verifyJwt] }, updateProfile)
}
