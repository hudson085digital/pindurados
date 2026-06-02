import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeUpdateSaleUseCase } from '@/use-cases/factories/make-update-sale-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { BusinessRuleError } from '@/use-cases/errors/business-rule-error'

export async function updateSale(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string().uuid() })
  const bodySchema = z.object({
    description: z.string().optional().nullable(),
    productCostInCents: z.coerce.number().int().nonnegative().optional(),
    saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })

  const { id } = paramsSchema.parse(request.params)
  const data = bodySchema.parse(request.body)

  try {
    const updateSale = makeUpdateSaleUseCase()
    const { sale } = await updateSale.execute({
      userId: request.user.sub,
      saleId: id,
      ...data,
    })
    return reply.status(200).send({ sale })
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
