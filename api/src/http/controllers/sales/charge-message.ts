import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeBuildChargeMessageUseCase } from '@/use-cases/factories/make-build-charge-message-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function chargeMessage(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ saleId: z.string().uuid() })
  const { saleId } = paramsSchema.parse(request.params)

  try {
    const build = makeBuildChargeMessageUseCase()
    const result = await build.execute({ userId: request.user.sub, saleId })
    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
