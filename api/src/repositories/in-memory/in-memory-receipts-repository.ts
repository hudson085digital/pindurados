import { Prisma, Receipt } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { ReceiptsRepository, ReceiptWithSale, AttachmentInput } from '../receipts-repository'
import { InMemorySalesRepository } from './in-memory-sales-repository'

// Implementação em memória. Recebe o repositório de vendas para manter a lista
// `sale.receipts` em sincronia ao criar recebimentos (espelha o banco real).
export class InMemoryReceiptsRepository implements ReceiptsRepository {
  public items: Receipt[] = []

  constructor(private salesRepository?: InMemorySalesRepository) {}

  async create(
    data: Prisma.ReceiptUncheckedCreateInput,
    attachmentsInput: AttachmentInput[] = [],
  ): Promise<Receipt> {
    const id = data.id ?? randomUUID()
    const attachments = attachmentsInput.map((a) => ({
      id: randomUUID(),
      path: a.path,
      method: a.method ?? null,
      createdAt: new Date(),
      receiptId: id,
    }))

    const receipt = {
      id,
      amountInCents: data.amountInCents,
      methods: (data.methods as Receipt['methods']) ?? [],
      methodAmountsInCents: (data.methodAmountsInCents as number[]) ?? [],
      receivedAt: new Date(data.receivedAt),
      note: data.note ?? null,
      receiptPath: data.receiptPath ?? null,
      reversesReceiptId: data.reversesReceiptId ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: new Date(),
      saleId: data.saleId,
      attachments,
    } as Receipt & { attachments: typeof attachments }

    this.items.push(receipt)

    const sale = this.salesRepository?.items.find((s) => s.id === receipt.saleId)
    if (sale) sale.receipts.push(receipt)

    return receipt
  }

  async update(id: string, data: Prisma.ReceiptUpdateInput): Promise<Receipt> {
    const receipt = this.items.find((r) => r.id === id)
    if (!receipt) throw new Error('Receipt not found')
    if (data.amountInCents !== undefined) receipt.amountInCents = data.amountInCents as number
    if (data.methods !== undefined) receipt.methods = data.methods as Receipt['methods']
    if (data.methodAmountsInCents !== undefined) receipt.methodAmountsInCents = data.methodAmountsInCents as number[]
    if (data.receivedAt !== undefined) receipt.receivedAt = new Date(data.receivedAt as string)
    if (data.note !== undefined) receipt.note = data.note as string | null
    if (data.receiptPath !== undefined) receipt.receiptPath = data.receiptPath as string | null
    return receipt
  }

  async findById(id: string): Promise<ReceiptWithSale | null> {
    const receipt = this.items.find((r) => r.id === id)
    if (!receipt) return null

    const sale = this.salesRepository?.items.find((s) => s.id === receipt.saleId)
    if (!sale) return null

    return { ...receipt, sale } as ReceiptWithSale
  }

  async addAttachments(receiptId: string, attachments: AttachmentInput[]): Promise<void> {
    const receipt = this.items.find((r) => r.id === receiptId) as
      | (Receipt & { attachments: { id: string; path: string; method: Receipt['methods'][number] | null; createdAt: Date; receiptId: string }[] })
      | undefined
    if (!receipt) return
    receipt.attachments = receipt.attachments ?? []
    attachments.forEach((a) =>
      receipt.attachments.push({
        id: randomUUID(),
        path: a.path,
        method: a.method ?? null,
        createdAt: new Date(),
        receiptId,
      }),
    )
  }

  async findReversalOf(receiptId: string): Promise<Receipt | null> {
    return this.items.find((r) => r.reversesReceiptId === receiptId) ?? null
  }
}
