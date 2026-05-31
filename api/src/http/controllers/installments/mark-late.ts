import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeMarkInstallmentLateUseCase } from '@/use-cases/factories/make-mark-installment-late-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function markLate(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string().uuid() })
  const bodySchema = z.object({
    lateFeePercent: z.coerce.number().nonnegative().optional(),
    reason: z.string().optional().nullable(),
  })

  const { id } = paramsSchema.parse(request.params)
  const { lateFeePercent, reason } = bodySchema.parse(request.body ?? {})

  try {
    const markLate = makeMarkInstallmentLateUseCase()
    const { installment } = await markLate.execute({
      userId: request.user.sub,
      installmentId: id,
      lateFeePercent,
      reason,
    })
    return reply.status(200).send({ installment })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
