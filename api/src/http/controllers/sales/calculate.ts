import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { calculateSale } from '@/use-cases/calculate-sale'

// Prévia do cálculo (sem salvar). Valores em centavos; a resposta também volta
// em centavos para o front formatar.
export async function calculate(request: FastifyRequest, reply: FastifyReply) {
  const bodySchema = z.object({
    type: z.enum(['AUTOMATIC', 'MANUAL', 'BY_TOTAL']).default('AUTOMATIC'),
    productValueInCents: z.coerce.number().int().nonnegative(),
    downPaymentInCents: z.coerce.number().int().nonnegative().default(0),
    interestPercent: z.coerce.number().nonnegative().optional(),
    installmentsCount: z.coerce.number().int().positive().optional(),
    targetTotalInCents: z.coerce.number().int().nonnegative().optional(),
    customInstallmentValuesInCents: z.array(z.coerce.number().int()).optional(),
  })

  const data = bodySchema.parse(request.body)
  const result = calculateSale(data)

  return reply.status(200).send(result)
}
