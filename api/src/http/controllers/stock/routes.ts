import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { PrismaStockUnitsRepository } from '@/repositories/prisma/prisma-stock-units-repository'
import { ManageStockUnitsUseCase } from '@/use-cases/manage-stock-units'

function makeUseCase() {
  return new ManageStockUnitsUseCase(new PrismaStockUnitsRepository())
}

async function fetchStockUnits(request: FastifyRequest, reply: FastifyReply) {
  const filters = z
    .object({
      status: z.enum(['AWAITING', 'AVAILABLE', 'SOLD']).optional(),
      productId: z.string().uuid().optional(),
      search: z.string().optional(),
    })
    .parse(request.query)

  const result = await makeUseCase().list(request.user.sub, filters)
  return reply.send(result)
}

async function updateStockUnit(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const data = z
    .object({
      serialNumber: z.string().trim().nullish(),
      imei1: z.string().trim().nullish(),
      imei2: z.string().trim().nullish(),
      danfe: z.string().trim().nullish(),
      note: z.string().trim().nullish(),
      meta: z
        .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional(),
    })
    .parse(request.body)

  const result = await makeUseCase().update(request.user.sub, id, data)
  return reply.send(result)
}

export async function stockRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.get('/stock-units', fetchStockUnits)
  app.patch('/stock-units/:id', updateStockUnit)
}
