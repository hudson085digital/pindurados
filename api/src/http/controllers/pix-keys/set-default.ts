import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeSetDefaultPixKeyUseCase } from '@/use-cases/factories/make-set-default-pix-key-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function setDefaultPixKey(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string().uuid() })
  const { id } = paramsSchema.parse(request.params)

  try {
    const setDefault = makeSetDefaultPixKeyUseCase()
    const { pixKey } = await setDefault.execute({
      userId: request.user.sub,
      pixKeyId: id,
    })
    return reply.status(200).send({ pixKey })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
