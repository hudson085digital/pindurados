import { SalesRepository } from '@/repositories/sales-repository'
import { StockUnitsRepository } from '@/repositories/stock-units-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface DeleteSaleUseCaseRequest {
  userId: string
  saleId: string
}

export class DeleteSaleUseCase {
  constructor(
    private salesRepository: SalesRepository,
    // Opcional para compatibilidade: sem repo, vendas com itens não devolvem estoque.
    private stockUnitsRepository?: StockUnitsRepository,
  ) {}

  async execute({ userId, saleId }: DeleteSaleUseCaseRequest): Promise<void> {
    const sale = await this.salesRepository.findById(saleId)
    if (!sale || sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Venda')
    }

    // 025 — devolve as unidades vendidas ao estoque antes de apagar a venda
    // (os SaleItems caem por cascade).
    if (sale.items.length > 0 && this.stockUnitsRepository) {
      await this.stockUnitsRepository.updateManyStatus(
        sale.items.map((item) => item.unitId),
        'AVAILABLE',
      )
    }

    await this.salesRepository.delete(saleId)
  }
}
