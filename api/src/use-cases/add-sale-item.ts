import { prisma } from '@/lib/prisma'
import { SalesRepository } from '@/repositories/sales-repository'
import { StockUnitsRepository } from '@/repositories/stock-units-repository'
import { serializeSale } from '@/utils/serialize-sale'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

interface AddSaleItemRequest {
  userId: string
  saleId: string
  unitId: string
  /** Preço informativo do item; default = valor do produto da venda (1º item)
   *  ou preço sugerido do produto. NÃO altera total/parcelas da venda. */
  priceInCents?: number
}

// Vincula um produto do estoque a uma venda já criada (resolve o alerta de
// "venda sem produto registrado"). Financeiro da venda não muda — apenas o
// custo (lucro passa a ser real) e o snapshot do item.
export class AddSaleItemUseCase {
  constructor(
    private salesRepository: SalesRepository,
    private stockUnitsRepository: StockUnitsRepository,
  ) {}

  async execute({ userId, saleId, unitId, priceInCents }: AddSaleItemRequest) {
    const sale = await this.salesRepository.findById(saleId)
    if (!sale || sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Venda')
    }

    const unit = await this.stockUnitsRepository.findById(unitId)
    if (!unit || unit.userId !== userId) {
      throw new ResourceNotFoundError('Unidade de estoque')
    }
    if (unit.status === 'SOLD') {
      throw new BusinessRuleError(
        `A unidade de "${unit.product.name}" já foi vendida.`,
      )
    }

    const warrantyDays = unit.product.warrantyDays ?? null
    const warrantyUntil = warrantyDays
      ? new Date(sale.saleDate.getTime() + warrantyDays * 86_400_000)
      : null

    const price =
      priceInCents ??
      (sale.items.length === 0
        ? sale.productValueInCents
        : (unit.product.suggestedPriceInCents ?? unit.finalCostInCents))

    await prisma.saleItem.create({
      data: {
        saleId,
        unitId,
        nameSnapshot: unit.product.name,
        priceInCents: price,
        discountInCents: 0,
        costSnapshotInCents: unit.finalCostInCents,
        warrantyDays,
        warrantyUntil,
      },
    })
    await this.stockUnitsRepository.updateManyStatus([unitId], 'SOLD')

    // custo real entra no lucro; descrição ganha o nome do produto se vazia
    await this.salesRepository.update(saleId, {
      productCostInCents: sale.productCostInCents + unit.finalCostInCents,
      ...(sale.description
        ? {}
        : { description: unit.product.name }),
    })

    const fresh = await this.salesRepository.findById(saleId)
    return { sale: serializeSale(fresh!) }
  }
}
