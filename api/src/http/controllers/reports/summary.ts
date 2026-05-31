import { FastifyReply, FastifyRequest } from 'fastify'
import { makeGetSummaryUseCase } from '@/use-cases/factories/make-get-summary-use-case'

export async function summary(request: FastifyRequest, reply: FastifyReply) {
  const getSummary = makeGetSummaryUseCase()
  const data = await getSummary.execute({ userId: request.user.sub })

  return reply.status(200).send(data)
}
