import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { extname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { makeCreateReceiptUseCase } from '@/use-cases/factories/make-create-receipt-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { BusinessRuleError } from '@/use-cases/errors/business-rule-error'
import { UPLOADS_DIR } from '@/lib/uploads'

// Registra um recebimento (crediário). Multipart/form-data: arquivo "comprovante"
// (OBRIGATÓRIO) + campos amountInCents, method (PIX|CASH), receivedAt?, note?.
export async function createReceipt(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ saleId: z.string().uuid() })
  const { saleId } = paramsSchema.parse(request.params)

  let amountInCents: number | undefined
  const methods: string[] = []
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
      if (part.fieldname === 'amountInCents') amountInCents = Number(part.value)
      // "methods" pode vir repetido (uma ou mais formas) ou separado por vírgula.
      if (part.fieldname === 'methods' && part.value) {
        methods.push(...String(part.value).split(',').map((m) => m.trim()).filter(Boolean))
      }
      if (part.fieldname === 'receivedAt' && part.value) receivedAt = new Date(String(part.value))
      if (part.fieldname === 'note' && part.value) note = String(part.value)
    }
  }

  const bodySchema = z.object({
    amountInCents: z.number().int().positive(),
    methods: z.array(z.enum(['PIX', 'CASH', 'CARD', 'CREDIT', 'DEBIT'])),
  })
  const parsed = bodySchema.safeParse({ amountInCents, methods })
  if (!parsed.success) {
    return reply.status(400).send({ message: 'Dados inválidos.', issues: parsed.error.format() })
  }

  try {
    const createReceipt = makeCreateReceiptUseCase()
    const { receipt } = await createReceipt.execute({
      userId: request.user.sub,
      saleId,
      amountInCents: parsed.data.amountInCents,
      methods: parsed.data.methods,
      receivedAt,
      note: note ?? null,
      receiptPath,
    })
    return reply.status(201).send({ receipt })
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
