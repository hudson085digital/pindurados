import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { makeProductsUseCase } from '@/use-cases/factories/make-products-use-case'

const productBody = z.object({
  name: z.string().trim().min(1, 'Informe o nome do produto.'),
  brand: z.string().trim().nullish(),
  color: z.string().trim().nullish(),
  category: z.string().trim().nullish(),
  subcategory: z.string().trim().nullish(),
  sku: z.string().trim().nullish(),
  barcode: z.string().trim().nullish(),
  productTypeId: z.string().uuid().nullish(),
  productModelId: z.string().uuid().nullish(),
  suggestedPriceInCents: z.number().int().nonnegative().nullish(),
  warrantyDays: z.number().int().nonnegative().nullish(),
  minQuantity: z.number().int().nonnegative().nullish(),
  note: z.string().trim().nullish(),
  // atributos livres (estilo post_meta) — só chaves preenchidas
  meta: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
})

async function createProduct(request: FastifyRequest, reply: FastifyReply) {
  const data = productBody.parse(request.body)
  const product = await makeProductsUseCase().create(request.user.sub, data)
  return reply.status(201).send({ product })
}

async function fetchProducts(request: FastifyRequest, reply: FastifyReply) {
  const { search } = z
    .object({ search: z.string().optional() })
    .parse(request.query)
  const products = await makeProductsUseCase().list(request.user.sub, search)
  return reply.send({ products })
}

async function updateProduct(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  const data = productBody.partial().parse(request.body)
  const product = await makeProductsUseCase().update(request.user.sub, id, data)
  return reply.send({ product })
}

async function deleteProduct(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
  await makeProductsUseCase().delete(request.user.sub, id)
  return reply.status(204).send()
}

export async function productsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.post('/products', createProduct)
  app.get('/products', fetchProducts)
  app.put('/products/:id', updateProduct)
  app.delete('/products/:id', deleteProduct)
}
