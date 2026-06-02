import { Prisma, Receipt, ReceiptMethod } from '@prisma/client'

// Recebimento com a venda e o devedor — usado para checar posse (userId) no estorno.
export type ReceiptWithSale = Prisma.ReceiptGetPayload<{
  include: { sale: { include: { customer: true } } }
}>

// Comprovante a anexar (vários por recebimento), cada um com forma opcional.
export interface AttachmentInput {
  path: string
  method?: ReceiptMethod | null
}

export interface ReceiptsRepository {
  create(
    data: Prisma.ReceiptUncheckedCreateInput,
    attachments?: AttachmentInput[],
  ): Promise<Receipt>
  findById(id: string): Promise<ReceiptWithSale | null>
  update(id: string, data: Prisma.ReceiptUpdateInput): Promise<Receipt>
  /** Adiciona comprovantes a um recebimento existente. */
  addAttachments(receiptId: string, attachments: AttachmentInput[]): Promise<void>
  /** Recebimento de estorno que aponta para este recebimento (se houver). */
  findReversalOf(receiptId: string): Promise<Receipt | null>
}
