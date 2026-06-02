import { FastifyReply, FastifyRequest } from 'fastify'
import { makeFetchPixKeysUseCase } from '@/use-cases/factories/make-fetch-pix-keys-use-case'

export async function fetchPixKeys(request: FastifyRequest, reply: FastifyReply) {
  const fetchPixKeys = makeFetchPixKeysUseCase()
  const { pixKeys } = await fetchPixKeys.execute({ userId: request.user.sub })
  return reply.status(200).send({ pixKeys })
}
