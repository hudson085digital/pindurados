import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeDeleteCustomerUseCase } from '@/use-cases/factories/make-delete-customer-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function deleteCustomer(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string().uuid() })
  const { id } = paramsSchema.parse(request.params)

  try {
    const deleteCustomer = makeDeleteCustomerUseCase()
    await deleteCustomer.execute({ userId: request.user.sub, customerId: id })
    return reply.status(204).send()
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
