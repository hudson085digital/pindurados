import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeCreateSaleUseCase } from '@/use-cases/factories/make-create-sale-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function createSale(request: FastifyRequest, reply: FastifyReply) {
  const bodySchema = z.object({
    customerId: z.string().uuid(),
    type: z.enum(['AUTOMATIC', 'MANUAL', 'BY_TOTAL']).default('AUTOMATIC'),
    description: z.string().optional().nullable(),
    productValueInCents: z.coerce.number().int().positive(),
    productCostInCents: z.coerce.number().int().nonnegative().default(0),
    downPaymentInCents: z.coerce.number().int().nonnegative().default(0),
    interestPercent: z.coerce.number().nonnegative().optional(),
    installmentsCount: z.coerce.number().int().positive().optional(),
    targetTotalInCents: z.coerce.number().int().nonnegative().optional(),
    customInstallmentValuesInCents: z.array(z.coerce.number().int()).optional(),
    lateFeePercent: z.coerce.number().nonnegative().optional(),
    saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })

  const data = bodySchema.parse(request.body)

  try {
    const createSale = makeCreateSaleUseCase()
    const { sale } = await createSale.execute({
      userId: request.user.sub,
      ...data,
    })
    return reply.status(201).send({ sale })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
