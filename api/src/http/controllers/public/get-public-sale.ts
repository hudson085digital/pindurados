import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeGetPublicSaleUseCase } from '@/use-cases/factories/make-get-public-sale-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function getPublicSale(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ token: z.string().min(1) })
  const { token } = paramsSchema.parse(request.params)

  try {
    const getPublicSale = makeGetPublicSaleUseCase()
    const { sale } = await getPublicSale.execute({ token })
    return reply.status(200).send({ sale })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      // 404 genérico e uniforme: não revela se a venda existe (FR-013/SC-004).
      return reply.status(404).send({ message: 'Link indisponível.' })
    }
    throw error
  }
}
