import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeCreateReceiptUseCase } from '@/use-cases/factories/make-create-receipt-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { BusinessRuleError } from '@/use-cases/errors/business-rule-error'

// Registra um recebimento no nível da venda (crediário). Alocação nas parcelas é
// derivada no back. Body JSON: amountInCents, method (PIX|CASH), receivedAt?, note?
export async function createReceipt(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ saleId: z.string().uuid() })
  const { saleId } = paramsSchema.parse(request.params)

  const bodySchema = z.object({
    amountInCents: z.coerce.number().int().positive(),
    method: z.enum(['PIX', 'CASH']),
    receivedAt: z.coerce.date().optional(),
    note: z.string().trim().max(500).optional(),
  })
  const { amountInCents, method, receivedAt, note } = bodySchema.parse(request.body)

  try {
    const createReceipt = makeCreateReceiptUseCase()
    const { receipt } = await createReceipt.execute({
      userId: request.user.sub,
      saleId,
      amountInCents,
      method,
      receivedAt,
      note: note ?? null,
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
