import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { makeUserOptionsUseCase } from '@/use-cases/factories/make-user-options-use-case'

const kindSchema = z.enum([
  'MARKETPLACE',
  'SALE_ORIGIN',
  'SALE_KIND',
  'PAYMENT_METHOD',
  'DELIVERY_TYPE',
  'PURCHASE_FORMAT',
  'PRODUCT_FIELD',
  'PRODUCT_TYPE',
  'CUSTOMER_KIND',
  'BRAND',
  'COLOR',
  'CATEGORY',
  'SUBCATEGORY',
])

async function fetchOptions(request: FastifyRequest, reply: FastifyReply) {
  const { kind } = z
    .object({ kind: kindSchema.optional() })
    .parse(request.query)

  const options = await makeUserOptionsUseCase().list(request.user.sub, kind)
  return reply.send({ options })
}

async function createOption(request: FastifyRequest, reply: FastifyReply) {
  const { kind, label, meta } = z
    .object({
      kind: kindSchema,
      label: z.string().trim().min(1),
      // meta: modo de cálculo base para formatos de compra customizados
      meta: z.enum(['NORMAL', 'PROMO', 'MILES', 'CASHBACK', 'IMMEDIATE', 'INSTALLMENTS']).nullish(),
    })
    .parse(request.body)

  const option = await makeUserOptionsUseCase().create(
    request.user.sub,
    kind,
    label,
    meta,
  )
  return reply.status(201).send({ option })
}

async function deleteOption(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

  await makeUserOptionsUseCase().delete(request.user.sub, id)
  return reply.status(204).send()
}

export async function optionsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.get('/options', fetchOptions)
  app.post('/options', createOption)
  app.delete('/options/:id', deleteOption)
}
