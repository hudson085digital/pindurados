import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeCreateSaleUseCase } from '@/use-cases/factories/make-create-sale-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function createSale(request: FastifyRequest, reply: FastifyReply) {
  const bodySchema = z.object({
    customerId: z.string().uuid(),
    type: z.enum(['MANUAL', 'BY_TOTAL']).default('MANUAL'),
    description: z.string().optional().nullable(),
    // 025 — com itens do estoque, valor e custo podem ser omitidos (derivam dos itens)
    productValueInCents: z.coerce.number().int().positive().optional(),
    productCostInCents: z.coerce.number().int().nonnegative().optional(),
    downPaymentInCents: z.coerce.number().int().nonnegative().default(0),
    interestPercent: z.coerce.number().nonnegative().optional(),
    installmentsCount: z.coerce.number().int().positive().optional(),
    targetTotalInCents: z.coerce.number().int().nonnegative().optional(),
    customInstallmentValuesInCents: z.array(z.coerce.number().int()).optional(),
    lateFeePercent: z.coerce.number().nonnegative().optional(),
    saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    // 025 — loja de eletrônicos (tudo opcional)
    items: z
      .array(
        z.object({
          unitId: z.string().uuid(),
          priceInCents: z.coerce.number().int().positive(),
          discountInCents: z.coerce.number().int().nonnegative().optional(),
          allowAwaiting: z.boolean().optional(),
        }),
      )
      .optional(),
    origin: z.string().trim().optional().nullable(),
    deliveryType: z.string().trim().optional().nullable(),
    saleKind: z.string().trim().optional().nullable(),
    customerKind: z.string().trim().optional().nullable(),
    immediateMethods: z
      .array(z.enum(['PIX', 'CASH', 'CARD', 'CREDIT', 'DEBIT', 'BOLETO', 'TRANSFER', 'OTHER']))
      .optional(),
    immediateMethodAmounts: z.array(z.coerce.number().int().positive()).optional(),
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
