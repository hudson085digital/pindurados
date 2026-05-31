import { Prisma } from '@prisma/client'

// Venda com parcelas, pagamentos e devedor — usado nas telas de detalhe/relatório.
export type SaleWithDetails = Prisma.SaleGetPayload<{
  include: {
    customer: true
    installments: {
      include: { payments: true }
    }
  }
}>

export interface SalesRepository {
  create(data: Prisma.SaleCreateInput): Promise<SaleWithDetails>
  findById(id: string): Promise<SaleWithDetails | null>
  findManyByCustomerId(customerId: string): Promise<SaleWithDetails[]>
  findManyByUserId(userId: string): Promise<SaleWithDetails[]>
  delete(id: string): Promise<void>
}
