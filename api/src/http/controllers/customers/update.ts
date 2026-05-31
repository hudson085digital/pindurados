import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeUpdateCustomerUseCase } from '@/use-cases/factories/make-update-customer-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function updateCustomer(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string().uuid() })
  const bodySchema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
  })

  const { id } = paramsSchema.parse(request.params)
  const data = bodySchema.parse(request.body)

  try {
    const updateCustomer = makeUpdateCustomerUseCase()
    const { customer } = await updateCustomer.execute({
      userId: request.user.sub,
      customerId: id,
      ...data,
    })
    return reply.status(200).send({ customer })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
