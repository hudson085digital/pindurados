import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeUpdateReceiptUseCase } from '@/use-cases/factories/make-update-receipt-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { BusinessRuleError } from '@/use-cases/errors/business-rule-error'
import { storeComprovante } from '@/lib/uploads'

// Edita um recebimento. Multipart/form-data: "comprovante" (opcional — mantém o
// atual se ausente) + amountInCents?, method?, receivedAt?, note?.
export async function updateReceipt(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({
    saleId: z.string().uuid(),
    receiptId: z.string().uuid(),
  })
  const { receiptId } = paramsSchema.parse(request.params)

  type Method = 'PIX' | 'CASH' | 'CARD' | 'CREDIT' | 'DEBIT'

  let amountInCents: number | undefined
  let methodsProvided = false
  const methods: Method[] = []
  let methodAmountsProvided = false
  const methodAmountsInCents: number[] = []
  let receivedAt: Date | undefined
  let note: string | undefined
  const paths: string[] = []
  let attachmentMethods: (Method | null)[] = []

  for await (const part of request.parts()) {
    if (part.type === 'file' && part.fieldname === 'comprovante') {
      if (part.filename) {
        paths.push(await storeComprovante(await part.toBuffer(), part.filename))
      } else {
        part.file.resume()
      }
    } else if (part.type === 'field') {
      if (part.fieldname === 'amountInCents' && part.value) amountInCents = Number(part.value)
      if (part.fieldname === 'methods') {
        methodsProvided = true
        methods.push(
          ...String(part.value)
            .split(',')
            .map((m) => m.trim())
            .filter(Boolean) as Method[],
        )
      }
      if (part.fieldname === 'methodAmounts') {
        methodAmountsProvided = true
        methodAmountsInCents.push(
          ...String(part.value).split(',').map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n)),
        )
      }
      if (part.fieldname === 'comprovanteMethods') {
        attachmentMethods = String(part.value).split(',').map((m) => {
          const v = m.trim()
          return v ? (v as Method) : null
        })
      }
      if (part.fieldname === 'receivedAt' && part.value) receivedAt = new Date(String(part.value))
      if (part.fieldname === 'note') note = String(part.value)
    }
  }

  const addAttachments = paths.map((path, i) => ({ path, method: attachmentMethods[i] ?? null }))

  try {
    const update = makeUpdateReceiptUseCase()
    const { receipt } = await update.execute({
      userId: request.user.sub,
      receiptId,
      amountInCents,
      methods: methodsProvided ? methods : undefined,
      methodAmountsInCents: methodAmountsProvided ? methodAmountsInCents : undefined,
      addAttachments,
      receivedAt,
      note,
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
