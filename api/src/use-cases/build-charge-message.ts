import { SalesRepository } from '@/repositories/sales-repository'
import { PixKeysRepository } from '@/repositories/pix-keys-repository'
import { serializeSale } from '@/utils/serialize-sale'
import { buildChargeMessage, buildWhatsappUrl } from '@/utils/build-charge-message'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface BuildChargeMessageUseCaseRequest {
  userId: string
  saleId: string
}

interface BuildChargeMessageUseCaseResponse {
  message: string
  phone: string | null
  whatsappUrl: string | null
}

export class BuildChargeMessageUseCase {
  constructor(
    private salesRepository: SalesRepository,
    private pixKeysRepository: PixKeysRepository,
  ) {}

  async execute({
    userId,
    saleId,
  }: BuildChargeMessageUseCaseRequest): Promise<BuildChargeMessageUseCaseResponse> {
    const sale = await this.salesRepository.findById(saleId)
    if (!sale || sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Venda')
    }

    const serialized = serializeSale(sale)
    const next = serialized.installments.find((i) => i.status !== 'PAID') ?? null
    const pixKey = await this.pixKeysRepository.findDefaultByUserId(userId)

    const message = buildChargeMessage({
      customerName: sale.customer.name,
      saleDescription: sale.description,
      balanceInCents: serialized.balanceInCents,
      settled: serialized.settled,
      nextInstallment: next
        ? {
            number: next.number,
            effectiveInCents: next.effectiveInCents,
            dueDate: next.dueDate,
            overdue: next.overdue,
            isLate: next.isLate,
            lateInterestInCents: next.lateInterestInCents,
          }
        : null,
      pixKey: pixKey
        ? {
            type: pixKey.type,
            key: pixKey.key,
            bankName: pixKey.bankName,
            holderName: pixKey.holderName,
          }
        : null,
    })

    const phone = sale.customer.phone
    return { message, phone, whatsappUrl: buildWhatsappUrl(phone, message) }
  }
}
