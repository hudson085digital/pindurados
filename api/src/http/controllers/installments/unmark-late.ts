import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeUnmarkInstallmentLateUseCase } from '@/use-cases/factories/make-unmark-installment-late-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function unmarkLate(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string().uuid() })
  const { id } = paramsSchema.parse(request.params)

  try {
    const unmarkLate = makeUnmarkInstallmentLateUseCase()
    const { installment } = await unmarkLate.execute({
      userId: request.user.sub,
      installmentId: id,
    })
    return reply.status(200).send({ installment })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
