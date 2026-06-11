import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeCreateShareLinkUseCase } from '@/use-cases/factories/make-create-share-link-use-case'
import { makeGetShareLinkUseCase } from '@/use-cases/factories/make-get-share-link-use-case'
import { makeRevokeShareLinkUseCase } from '@/use-cases/factories/make-revoke-share-link-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

const paramsSchema = z.object({ id: z.string().uuid() })

// POST /sales/:id/share-link — cria ou rotaciona o token.
export async function createShareLink(request: FastifyRequest, reply: FastifyReply) {
  const { id } = paramsSchema.parse(request.params)
  const bodySchema = z.object({
    expiresAt: z.coerce.date().nullish(),
  })
  const { expiresAt } = bodySchema.parse(request.body ?? {})

  try {
    const createShareLink = makeCreateShareLinkUseCase()
    const result = await createShareLink.execute({
      userId: request.user.sub,
      saleId: id,
      expiresAt: expiresAt ?? null,
    })
    return reply.status(201).send(result)
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

// GET /sales/:id/share-link — estado atual do link.
export async function getShareLink(request: FastifyRequest, reply: FastifyReply) {
  const { id } = paramsSchema.parse(request.params)

  try {
    const getShareLink = makeGetShareLinkUseCase()
    const result = await getShareLink.execute({ userId: request.user.sub, saleId: id })
    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

// DELETE /sales/:id/share-link — revoga (invalida imediatamente).
export async function revokeShareLink(request: FastifyRequest, reply: FastifyReply) {
  const { id } = paramsSchema.parse(request.params)

  try {
    const revokeShareLink = makeRevokeShareLinkUseCase()
    await revokeShareLink.execute({ userId: request.user.sub, saleId: id })
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
