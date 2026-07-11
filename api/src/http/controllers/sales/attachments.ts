import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { storeComprovante } from '@/lib/uploads'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

// Fotos da VENDA (025): etiqueta do marketplace, nº de série, comprovante de
// entrega (motoqueiro/Uber)… Multipart: arquivos "foto" + campo "kind".
async function ensureOwnedSale(saleId: string, userId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { customer: true },
  })
  if (!sale || sale.customer.userId !== userId) {
    throw new ResourceNotFoundError('Venda')
  }
  return sale
}

export async function addSaleAttachments(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { saleId } = z.object({ saleId: z.string().uuid() }).parse(request.params)
  await ensureOwnedSale(saleId, request.user.sub)

  let kind: string | null = null
  const paths: string[] = []
  for await (const part of request.parts()) {
    if (part.type === 'file' && part.fieldname === 'foto') {
      if (part.filename) {
        paths.push(await storeComprovante(await part.toBuffer(), part.filename))
      } else {
        part.file.resume()
      }
    } else if (part.type === 'field' && part.fieldname === 'kind') {
      kind = String(part.value).trim() || null
    }
  }

  if (paths.length === 0) {
    return reply.status(400).send({ message: 'Envie ao menos uma foto.' })
  }

  const attachments = await prisma.$transaction(
    paths.map((path) =>
      prisma.saleAttachment.create({ data: { saleId, kind, path } }),
    ),
  )
  return reply.status(201).send({ attachments })
}

export async function deleteSaleAttachment(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { saleId, attachmentId } = z
    .object({ saleId: z.string().uuid(), attachmentId: z.string().uuid() })
    .parse(request.params)
  await ensureOwnedSale(saleId, request.user.sub)

  const attachment = await prisma.saleAttachment.findUnique({
    where: { id: attachmentId },
  })
  if (!attachment || attachment.saleId !== saleId) {
    throw new ResourceNotFoundError('Foto')
  }
  await prisma.saleAttachment.delete({ where: { id: attachmentId } })
  return reply.status(204).send()
}
