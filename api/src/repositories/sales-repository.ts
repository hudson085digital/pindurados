import { Prisma } from '@prisma/client'

// Venda com parcelas, recebimentos e devedor — usado nas telas de detalhe/relatório.
// A alocação dos recebimentos nas parcelas é derivada em serialize-sale.
export type SaleWithDetails = Prisma.SaleGetPayload<{
  include: {
    customer: true
    installments: true
    receipts: true
  }
}>

// Parcela usada no reparcelamento (regenera o cronograma).
export interface ReparcelarInstallment {
  number: number
  amountInCents: number
  dueDate: Date
}

export interface SalesRepository {
  create(data: Prisma.SaleCreateInput): Promise<SaleWithDetails>
  findById(id: string): Promise<SaleWithDetails | null>
  findManyByCustomerId(customerId: string): Promise<SaleWithDetails[]>
  findManyByUserId(userId: string): Promise<SaleWithDetails[]>
  update(id: string, data: Prisma.SaleUpdateInput): Promise<SaleWithDetails>
  /** Atualiza a venda e SUBSTITUI as parcelas (reparcelamento). */
  reparcelar(
    id: string,
    data: Prisma.SaleUpdateInput,
    installments: ReparcelarInstallment[],
  ): Promise<SaleWithDetails>
  delete(id: string): Promise<void>
}
