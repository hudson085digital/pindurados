import { FastifyInstance } from 'fastify'
import { getPublicSale } from './get-public-sale'

// Grupo de rotas PÚBLICO — SEM verifyJwt. O acesso é resolvido pelo token, não por userId.
export async function publicRoutes(app: FastifyInstance) {
  app.get('/public/sales/:token', getPublicSale)
}
