import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeVoidReceiptUseCase } from '@/use-cases/factories/make-void-receipt-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { BusinessRuleError } from '@/use-cases/errors/business-rule-error'

// Estorna um recebimento (cria um lançamento negativo ligado ao original).
export async function voidReceipt(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({
    saleId: z.string().uuid(),
    receiptId: z.string().uuid(),
  })
  const { receiptId } = paramsSchema.parse(request.params)

  try {
    const voidReceipt = makeVoidReceiptUseCase()
    const { receipt } = await voidReceipt.execute({
      userId: request.user.sub,
      receiptId,
    })
    return reply.status(201).send({ receipt })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    if (error instanceof BusinessRuleError) {
      return reply.status(400).send({ message: error.message })
    }
    throw error
  }
}
