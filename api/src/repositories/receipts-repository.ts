import { Prisma, Receipt } from '@prisma/client'

// Recebimento com a venda e o devedor — usado para checar posse (userId) no estorno.
export type ReceiptWithSale = Prisma.ReceiptGetPayload<{
  include: { sale: { include: { customer: true } } }
}>

export interface ReceiptsRepository {
  create(data: Prisma.ReceiptUncheckedCreateInput): Promise<Receipt>
  findById(id: string): Promise<ReceiptWithSale | null>
  /** Recebimento de estorno que aponta para este recebimento (se houver). */
  findReversalOf(receiptId: string): Promise<Receipt | null>
}
