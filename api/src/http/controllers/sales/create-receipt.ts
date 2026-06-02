import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeCreateReceiptUseCase } from '@/use-cases/factories/make-create-receipt-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { BusinessRuleError } from '@/use-cases/errors/business-rule-error'
import { storeComprovante } from '@/lib/uploads'

// Registra um recebimento (crediário). Multipart/form-data: arquivo(s) "comprovante"
// (opcional) + amountInCents, methods, methodAmounts, comprovanteMethods, receivedAt, note.
export async function createReceipt(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ saleId: z.string().uuid() })
  const { saleId } = paramsSchema.parse(request.params)

  type Method = 'PIX' | 'CASH' | 'CARD' | 'CREDIT' | 'DEBIT'

  let amountInCents: number | undefined
  const methods: string[] = []
  const methodAmountsInCents: number[] = []
  let receivedAt: Date | undefined
  let note: string | undefined
  const paths: string[] = []
  let attachmentMethods: (Method | null)[] = []

  try {
    for await (const part of request.parts()) {
      if (part.type === 'file' && part.fieldname === 'comprovante') {
        if (part.filename) {
          paths.push(await storeComprovante(await part.toBuffer(), part.filename))
        } else {
          part.file.resume()
        }
      } else if (part.type === 'field') {
        if (part.fieldname === 'amountInCents') amountInCents = Number(part.value)
        if (part.fieldname === 'methods' && part.value) {
          methods.push(...String(part.value).split(',').map((m) => m.trim()).filter(Boolean))
        }
        if (part.fieldname === 'methodAmounts' && part.value) {
          methodAmountsInCents.push(
            ...String(part.value).split(',').map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n)),
          )
        }
        // formas dos comprovantes, alinhadas à ordem dos arquivos ("" = sem forma).
        if (part.fieldname === 'comprovanteMethods') {
          attachmentMethods = String(part.value).split(',').map((m) => {
            const v = m.trim()
            return v ? (v as Method) : null
          })
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

    const attachments = paths.map((path, i) => ({ path, method: attachmentMethods[i] ?? null }))

    const createReceipt = makeCreateReceiptUseCase()
    const { receipt } = await createReceipt.execute({
      userId: request.user.sub,
      saleId,
      amountInCents: parsed.data.amountInCents,
      methods: parsed.data.methods,
      methodAmountsInCents,
      receivedAt,
      note: note ?? null,
      attachments,
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
