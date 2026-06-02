import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { extname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { makeUpdateReceiptUseCase } from '@/use-cases/factories/make-update-receipt-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { BusinessRuleError } from '@/use-cases/errors/business-rule-error'
import { UPLOADS_DIR } from '@/lib/uploads'

// Edita um recebimento. Multipart/form-data: "comprovante" (opcional — mantém o
// atual se ausente) + amountInCents?, method?, receivedAt?, note?.
export async function updateReceipt(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({
    saleId: z.string().uuid(),
    receiptId: z.string().uuid(),
  })
  const { receiptId } = paramsSchema.parse(request.params)

  let amountInCents: number | undefined
  let method: 'PIX' | 'CASH' | undefined
  let receivedAt: Date | undefined
  let note: string | undefined
  let receiptPath: string | null = null

  for await (const part of request.parts()) {
    if (part.type === 'file' && part.fieldname === 'comprovante') {
      if (part.filename) {
        const filename = `${randomUUID()}${extname(part.filename)}`
        await pipeline(part.file, createWriteStream(join(UPLOADS_DIR, filename)))
        receiptPath = filename
      } else {
        part.file.resume()
      }
    } else if (part.type === 'field') {
      if (part.fieldname === 'amountInCents' && part.value) amountInCents = Number(part.value)
      if (part.fieldname === 'method' && part.value) method = String(part.value) as 'PIX' | 'CASH'
      if (part.fieldname === 'receivedAt' && part.value) receivedAt = new Date(String(part.value))
      if (part.fieldname === 'note') note = String(part.value)
    }
  }

  try {
    const update = makeUpdateReceiptUseCase()
    const { receipt } = await update.execute({
      userId: request.user.sub,
      receiptId,
      amountInCents,
      method,
      receivedAt,
      note,
      receiptPath,
    })
    return reply.status(200).send({ receipt })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    if (error instanceof BusinessRuleError) {
      return reply.status(400).send({ message: error.message })
    }
    throw error
  }
}
