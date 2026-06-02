import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeCreatePixKeyUseCase } from '@/use-cases/factories/make-create-pix-key-use-case'

export async function createPixKey(request: FastifyRequest, reply: FastifyReply) {
  const bodySchema = z.object({
    type: z.enum(['RANDOM', 'CPF', 'CNPJ', 'EMAIL', 'PHONE']),
    key: z.string().min(1, 'Informe a chave.'),
    bankName: z.string().min(1, 'Informe o banco.'),
    holderName: z.string().min(1, 'Informe o titular.'),
    makeDefault: z.boolean().optional(),
  })
  const data = bodySchema.parse(request.body)

  const createPixKey = makeCreatePixKeyUseCase()
  const { pixKey } = await createPixKey.execute({
    userId: request.user.sub,
    ...data,
  })

  return reply.status(201).send({ pixKey })
}
