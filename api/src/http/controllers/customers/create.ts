import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeCreateCustomerUseCase } from '@/use-cases/factories/make-create-customer-use-case'

export async function createCustomer(request: FastifyRequest, reply: FastifyReply) {
  const bodySchema = z.object({
    name: z.string().min(1, 'Informe o nome.'),
    phone: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    autoReminder: z.boolean().optional(),
    // 025 — campos extras (todos opcionais)
    kind: z.string().trim().optional().nullable(),
    cpfCnpj: z.string().trim().optional().nullable(),
    instagram: z.string().trim().optional().nullable(),
    tags: z.array(z.string().trim().min(1)).optional(),
    addressZip: z.string().trim().optional().nullable(),
    addressStreet: z.string().trim().optional().nullable(),
    addressNumber: z.string().trim().optional().nullable(),
    addressDistrict: z.string().trim().optional().nullable(),
    addressCity: z.string().trim().optional().nullable(),
    addressState: z.string().trim().optional().nullable(),
    addressComplement: z.string().trim().optional().nullable(),
  })

  const data = bodySchema.parse(request.body)

  const createCustomer = makeCreateCustomerUseCase()
  const { customer } = await createCustomer.execute({
    userId: request.user.sub,
    ...data,
  })

  return reply.status(201).send({ customer })
}
