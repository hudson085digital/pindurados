import { Receipt, ReceiptMethod } from '@prisma/client'
import { SalesRepository } from '@/repositories/sales-repository'
import { ReceiptsRepository, AttachmentInput } from '@/repositories/receipts-repository'
import { allocateReceipts, sumReceipts } from '@/utils/allocate-receipts'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

interface CreateReceiptUseCaseRequest {
  userId: string
  saleId: string
  amountInCents: number
  methods: ReceiptMethod[]
  /** Valor por forma (alinhado a methods); obrigatório quando há 2+ formas. */
  methodAmountsInCents?: number[]
  receivedAt?: Date
  note?: string | null
  receiptPath?: string | null
  /** Comprovantes (1+), cada um com forma opcional. */
  attachments?: AttachmentInput[]
}

interface CreateReceiptUseCaseResponse {
  receipt: Receipt
}

function formatBRL(cents: number): string {
  const intPart = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decPart = String(cents % 100).padStart(2, '0')
  return `R$ ${intPart},${decPart}`
}

// Valida/normaliza o valor por forma. Com 2+ formas exige valores que somem o total.
export function resolveMethodAmounts(
  methods: ReceiptMethod[],
  amountInCents: number,
  methodAmountsInCents: number[] | undefined,
): number[] {
  if (methods.length < 2) return []

  const amounts = methodAmountsInCents ?? []
  if (amounts.length !== methods.length || amounts.some((a) => !Number.isInteger(a) || a <= 0)) {
    throw new BusinessRuleError('Informe o valor de cada forma de pagamento (maior que zero).')
  }
  if (amounts.reduce((s, a) => s + a, 0) !== amountInCents) {
    throw new BusinessRuleError('A soma dos valores por forma deve ser igual ao valor recebido.')
  }
  return amounts
}

export class CreateReceiptUseCase {
  constructor(
    private salesRepository: SalesRepository,
    private receiptsRepository: ReceiptsRepository,
  ) {}

  async execute({
    userId,
    saleId,
    amountInCents,
    methods,
    methodAmountsInCents,
    receivedAt,
    note,
    receiptPath,
    attachments,
  }: CreateReceiptUseCaseRequest): Promise<CreateReceiptUseCaseResponse> {
    const sale = await this.salesRepository.findById(saleId)
    if (!sale || sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Venda')
    }

    if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
      throw new BusinessRuleError('Informe um valor de recebimento maior que zero.')
    }

    // Comprovante de pagamento é obrigatório (spec 005): ao menos um (legado ou anexo).
    if (!receiptPath && (!attachments || attachments.length === 0)) {
      throw new BusinessRuleError('Anexe o comprovante de pagamento.')
    }

    // Saldo atual = total devido (com multa/juros) − recebimentos já lançados.
    const allocation = allocateReceipts(
      sale.installments.map((inst) => ({
        amountInCents: inst.amountInCents,
        isLate: inst.isLate,
        lateInterestInCents: inst.lateInterestInCents,
      })),
      sumReceipts(sale.receipts),
    )
    const balanceInCents = allocation.balanceInCents

    if (balanceInCents <= 0) {
      throw new BusinessRuleError('Este crediário já está quitado.')
    }

    // Q2: limita o recebimento ao saldo (sem crédito a favor).
    if (amountInCents > balanceInCents) {
      throw new BusinessRuleError(
        `O valor excede o saldo devedor. Receba no máximo ${formatBRL(balanceInCents)}.`,
      )
    }

    const methodAmounts = resolveMethodAmounts(methods ?? [], amountInCents, methodAmountsInCents)

    const receipt = await this.receiptsRepository.create(
      {
        saleId,
        amountInCents,
        methods: methods ?? [],
        methodAmountsInCents: methodAmounts,
        receivedAt: receivedAt ?? new Date(),
        note: note ?? null,
        receiptPath: receiptPath ?? null,
        createdBy: userId,
      },
      attachments,
    )

    return { receipt }
  }
}
