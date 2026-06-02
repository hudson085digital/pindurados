import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeUpdateInstallmentDueDateUseCase } from '@/use-cases/factories/make-update-installment-due-date-use-case'
import { isoToDate } from '@/utils/add-months'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function updateDueDate(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string().uuid() })
  const bodySchema = z.object({
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.'),
  })

  const { id } = paramsSchema.parse(request.params)
  const { dueDate } = bodySchema.parse(request.body)

  try {
    const update = makeUpdateInstallmentDueDateUseCase()
    const { installment } = await update.execute({
      userId: request.user.sub,
      installmentId: id,
      dueDate: isoToDate(dueDate),
    })
    return reply.status(200).send({ installment })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
