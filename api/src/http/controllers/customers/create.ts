import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeCreateCustomerUseCase } from '@/use-cases/factories/make-create-customer-use-case'

export async function createCustomer(request: FastifyRequest, reply: FastifyReply) {
  const bodySchema = z.object({
    name: z.string().min(1, 'Informe o nome.'),
    phone: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    autoReminder: z.boolean().optional(),
  })

  const { name, phone, note, autoReminder } = bodySchema.parse(request.body)

  const createCustomer = makeCreateCustomerUseCase()
  const { customer } = await createCustomer.execute({
    userId: request.user.sub,
    name,
    phone,
    note,
    autoReminder,
  })

  return reply.status(201).send({ customer })
}
