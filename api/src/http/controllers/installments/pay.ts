import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { extname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { makePayInstallmentUseCase } from '@/use-cases/factories/make-pay-installment-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { UPLOADS_DIR } from '@/lib/uploads'

// Aceita multipart/form-data: campo "comprovante" (arquivo, opcional) + campos
// de texto (amountInCents, paidAt). Pagamento pode ser parcial.
export async function payInstallment(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string().uuid() })
  const { id } = paramsSchema.parse(request.params)

  let amountInCents: number | undefined
  let paidAt: Date | undefined
  let receiptPath: string | null = null

  const parts = request.parts()
  for await (const part of parts) {
    if (part.type === 'file' && part.fieldname === 'comprovante') {
      if (part.filename) {
        const filename = `${randomUUID()}${extname(part.filename)}`
        await pipeline(part.file, createWriteStream(join(UPLOADS_DIR, filename)))
        receiptPath = filename
      } else {
        part.file.resume()
      }
    } else if (part.type === 'field') {
      if (part.fieldname === 'amountInCents') amountInCents = Number(part.value)
      if (part.fieldname === 'paidAt' && part.value) paidAt = new Date(String(part.value))
    }
  }

  if (!amountInCents || amountInCents <= 0) {
    return reply.status(400).send({ message: 'Informe um valor válido.' })
  }

  try {
    const payInstallment = makePayInstallmentUseCase()
    await payInstallment.execute({
      userId: request.user.sub,
      installmentId: id,
      amountInCents,
      paidAt,
      receiptPath,
    })
    return reply.status(201).send()
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
