import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { PrismaStockUnitsRepository } from '@/repositories/prisma/prisma-stock-units-repository'
import { AddSaleItemUseCase } from '@/use-cases/add-sale-item'

// Vincula produto do estoque a uma venda existente (resolve "sem produto").
export async function addSaleItem(request: FastifyRequest, reply: FastifyReply) {
  const { saleId } = z.object({ saleId: z.string().uuid() }).parse(request.params)
  const { unitId, priceInCents } = z
    .object({
      unitId: z.string().uuid(),
      priceInCents: z.coerce.number().int().positive().optional(),
    })
    .parse(request.body)

  const useCase = new AddSaleItemUseCase(
    new PrismaSalesRepository(),
    new PrismaStockUnitsRepository(),
  )
  const { sale } = await useCase.execute({
    userId: request.user.sub,
    saleId,
    unitId,
    priceInCents,
  })
  return reply.status(201).send({ sale })
}
