import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeGetSaleUseCase } from '@/use-cases/factories/make-get-sale-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function saleDetails(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string().uuid() })
  const { id } = paramsSchema.parse(request.params)

  try {
    const getSale = makeGetSaleUseCase()
    const { sale } = await getSale.execute({ userId: request.user.sub, saleId: id })
    return reply.status(200).send({ sale })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
