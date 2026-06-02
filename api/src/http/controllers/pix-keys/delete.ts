import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeDeletePixKeyUseCase } from '@/use-cases/factories/make-delete-pix-key-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function deletePixKey(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string().uuid() })
  const { id } = paramsSchema.parse(request.params)

  try {
    const deletePixKey = makeDeletePixKeyUseCase()
    await deletePixKey.execute({ userId: request.user.sub, pixKeyId: id })
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
