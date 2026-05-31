import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeDeleteSaleUseCase } from '@/use-cases/factories/make-delete-sale-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function deleteSale(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string().uuid() })
  const { id } = paramsSchema.parse(request.params)

  try {
    const deleteSale = makeDeleteSaleUseCase()
    await deleteSale.execute({ userId: request.user.sub, saleId: id })
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
