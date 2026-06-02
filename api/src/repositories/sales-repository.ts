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

export interface SalesRepository {
  create(data: Prisma.SaleCreateInput): Promise<SaleWithDetails>
  findById(id: string): Promise<SaleWithDetails | null>
  findManyByCustomerId(customerId: string): Promise<SaleWithDetails[]>
  findManyByUserId(userId: string): Promise<SaleWithDetails[]>
  delete(id: string): Promise<void>
}
