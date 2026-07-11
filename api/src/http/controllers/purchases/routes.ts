import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import {
  makeImportPurchasesUseCase,
  makePurchasesUseCase,
} from '@/use-cases/factories/make-purchases-use-case'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')

const purchaseBody = z.object({
  productId: z.string().uuid(),
  date: isoDate,
  quantity: z.number().int().min(1).optional(),
  unitValueInCents: z.number().int().positive(),
  freightInCents: z.number().int().nonnegative().optional(),
  orderNumber: z.string().trim().nullish(),
  account: z.string().trim().nullish(),
  marketplace: z.string().trim().nullish(),
  format: z.enum(['NORMAL', 'PROMO', 'MILES', 'CASHBACK']).optional(),
  formatLabel: z.string().trim().nullish(),
  paymentMethod: z.string().trim().nullish(),
  bankCard: z.string().trim().nullish(),
  accrualPerReal: z.number().nonnegative().nullish(),
  cpmInCents: z.number().int().nonnegative().nullish(),
  cashbackPercent: z.number().nonnegative().nullish(),
  nubankAdvance: z.boolean().optional(),
  nubankDiscountPercent: z.number().nonnegative().optional(),
  productExpectedAt: isoDate.nullish(),
  creditExpectedAt: isoDate.nullish(),
  note: z.string().trim().nullish(),
})

async function createPurchase(request: FastifyRequest, reply: FastifyReply) {
  const data = purchaseBody.parse(request.body)
  const { purchase } = await makePurchasesUseCase().create(
    request.user.sub,
    data,
  )
  return reply.status(201).send({ purchase })
}

async function fetchPurchases(request: FastifyRequest, reply: FastifyReply) {
  const filters = z
    .object({
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      marketplace: z.string().optional(),
      format: z.enum(['NORMAL', 'PROMO', 'MILES', 'CASHBACK']).optional(),
      productStatus: z.enum(['RECEIVED', 'NOT_RECEIVED']).optional(),
      creditStatus: z.enum(['CREDITED', 'NOT_CREDITED']).optional(),
      search: z.string().optional(),
    })
    .parse(request.query)

  const result = await makePurchasesUseCase().list(request.user.sub, filters)
  return reply.send(result)
}

async function updatePurchase(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const data = purchaseBody.partial().parse(request.body)
  const { purchase } = await makePurchasesUseCase().update(
    request.user.sub,
    id,
    data,
  )
  return reply.send({ purchase })
}

async function receivePurchase(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const { receivedAt, units } = z
    .object({
      receivedAt: isoDate,
      units: z
        .array(
          z.object({
            unitId: z.string().uuid(),
            serialNumber: z.string().trim().nullish(),
            imei1: z.string().trim().nullish(),
            imei2: z.string().trim().nullish(),
            danfe: z.string().trim().nullish(),
          }),
        )
        .optional(),
    })
    .parse(request.body)

  const { purchase } = await makePurchasesUseCase().receiveProduct(
    request.user.sub,
    id,
    receivedAt,
    units,
  )
  return reply.send({ purchase })
}

async function creditPurchase(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const { creditedAt, actualCreditInCents } = z
    .object({
      creditedAt: isoDate,
      actualCreditInCents: z.number().int().nonnegative().optional(),
    })
    .parse(request.body)

  const { purchase } = await makePurchasesUseCase().confirmCredit(
    request.user.sub,
    id,
    creditedAt,
    actualCreditInCents,
  )
  return reply.send({ purchase })
}

async function cancelPurchase(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  await makePurchasesUseCase().cancel(request.user.sub, id)
  return reply.status(204).send()
}

// Importa a planilha .xlsx (multipart, campo "planilha").
async function importPurchases(request: FastifyRequest, reply: FastifyReply) {
  const file = await request.file()
  if (!file) {
    return reply.status(400).send({ message: 'Envie o arquivo .xlsx.' })
  }
  const buffer = await file.toBuffer()
  const report = await makeImportPurchasesUseCase().execute(
    request.user.sub,
    buffer,
  )
  return reply.send(report)
}

export async function purchasesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.post('/purchases', createPurchase)
  app.get('/purchases', fetchPurchases)
  app.put('/purchases/:id', updatePurchase)
  app.patch('/purchases/:id/receive', receivePurchase)
  app.patch('/purchases/:id/credit', creditPurchase)
  app.delete('/purchases/:id', cancelPurchase)
  app.post('/purchases/import', importPurchases)
}
