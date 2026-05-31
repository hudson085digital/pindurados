import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeGetCustomerDetailsUseCase } from '@/use-cases/factories/make-get-customer-details-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function customerDetails(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string().uuid() })
  const { id } = paramsSchema.parse(request.params)

  try {
    const getDetails = makeGetCustomerDetailsUseCase()
    const data = await getDetails.execute({
      userId: request.user.sub,
      customerId: id,
    })
    return reply.status(200).send(data)
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
