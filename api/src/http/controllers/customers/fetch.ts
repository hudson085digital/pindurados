import { FastifyReply, FastifyRequest } from 'fastify'
import { makeFetchCustomersUseCase } from '@/use-cases/factories/make-fetch-customers-use-case'

export async function fetchCustomers(request: FastifyRequest, reply: FastifyReply) {
  const fetchCustomers = makeFetchCustomersUseCase()
  const { customers } = await fetchCustomers.execute({ userId: request.user.sub })

  return reply.status(200).send({ customers })
}
