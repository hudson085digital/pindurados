import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { ManageCatalogUseCase } from '@/use-cases/manage-catalog'

const catalog = new ManageCatalogUseCase()
const idParam = z.object({ id: z.string().uuid() })
const nameBody = z.object({ name: z.string().trim().min(1) })

async function listTypes(request: FastifyRequest, reply: FastifyReply) {
  const types = await catalog.listTypes(request.user.sub)
  return reply.send({ types })
}

async function createType(request: FastifyRequest, reply: FastifyReply) {
  const { name } = nameBody.parse(request.body)
  const type = await catalog.createType(request.user.sub, name)
  return reply.status(201).send({ type })
}

async function renameType(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(request.params)
  const { name } = nameBody.parse(request.body)
  const type = await catalog.renameType(request.user.sub, id, name)
  return reply.send({ type })
}

async function deleteType(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(request.params)
  await catalog.deleteType(request.user.sub, id)
  return reply.status(204).send()
}

async function createModel(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(request.params)
  const { name } = nameBody.parse(request.body)
  const model = await catalog.createModel(request.user.sub, id, name)
  return reply.status(201).send({ model })
}

async function renameModel(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(request.params)
  const { name } = nameBody.parse(request.body)
  const model = await catalog.renameModel(request.user.sub, id, name)
  return reply.send({ model })
}

async function deleteModel(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(request.params)
  await catalog.deleteModel(request.user.sub, id)
  return reply.status(204).send()
}

async function createField(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(request.params)
  const { label } = z.object({ label: z.string().trim().min(1) }).parse(request.body)
  const field = await catalog.createField(request.user.sub, id, label)
  return reply.status(201).send({ field })
}

async function deleteField(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(request.params)
  await catalog.deleteField(request.user.sub, id)
  return reply.status(204).send()
}

export async function catalogRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.get('/product-types', listTypes)
  app.post('/product-types', createType)
  app.put('/product-types/:id', renameType)
  app.delete('/product-types/:id', deleteType)
  app.post('/product-types/:id/models', createModel)
  app.put('/product-models/:id', renameModel)
  app.delete('/product-models/:id', deleteModel)
  app.post('/product-types/:id/fields', createField)
  app.delete('/product-type-fields/:id', deleteField)
}
