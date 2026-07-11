import * as XLSX from 'xlsx'
import { PurchaseFormat } from '@prisma/client'
import { ProductsRepository } from '@/repositories/products-repository'
import { ManagePurchasesUseCase } from './manage-purchases'

// Importa a planilha real "Compras de Produtos - Milhas" (.xlsx).
// Suporta os DOIS layouts encontrados: Jan–Mar (sem Quantidade) e Abr–Jun
// (com Quantidade e Banco/Cartão). Linhas inválidas não abortam — voltam no
// relatório com o motivo.

export interface ImportReport {
  imported: number
  skipped: { sheet: string; line: number; reason: string }[]
}

// "R$ 4,699.00" (US: vírgula milhar, ponto decimal) → centavos.
export function parseMoneyToCents(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const text = String(raw).replace(/R\$\s*/gi, '').replace(/\s/g, '').trim()
  if (!text || text === '-') return null
  const normalized = text.replace(/,/g, '')
  const value = Number(normalized)
  if (Number.isNaN(value)) return null
  return Math.round(value * 100)
}

// "06/01/2026", "7/1/2026" → ISO (dd/mm/yyyy).
export function parseBRDate(raw: unknown): string | null {
  if (!raw) return null
  const text = String(raw).trim()
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, d, m, y] = match
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// Bloco "Dados do Produto": SN / IMEI / IMEI2 / DANFE em linhas soltas.
export function parseUnitData(raw: unknown): {
  serialNumber?: string
  imei1?: string
  imei2?: string
  danfe?: string
} {
  if (!raw) return {}
  const text = String(raw)
  const get = (re: RegExp) => text.match(re)?.[1]?.trim().replace(/\.$/, '')
  return {
    serialNumber: get(/SN:\s*([^\n]+)/i),
    imei1: get(/IMEI1?:\s*([\d\s]+)/i)?.replace(/\s/g, ''),
    imei2: get(/IMEI\s*2:\s*([\d\s]+)/i)?.replace(/\s/g, ''),
    danfe: get(/DANFE:\s*([\d\s?]+)/i)?.replace(/\s/g, ''),
  }
}

function mapFormat(raw: unknown): PurchaseFormat {
  const text = String(raw ?? '').toLowerCase()
  if (text.startsWith('milha')) return 'MILES'
  if (text.startsWith('cash')) return 'CASHBACK'
  if (text.startsWith('promo')) return 'PROMO'
  return 'NORMAL'
}

export class ImportPurchasesUseCase {
  constructor(
    private purchasesUseCase: ManagePurchasesUseCase,
    private productsRepository: ProductsRepository,
  ) {}

  async execute(userId: string, fileBuffer: Buffer): Promise<ImportReport> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const report: ImportReport = { imported: 0, skipped: [] }

    // cache nome → productId (find-or-create por nome exato)
    const existing = await this.productsRepository.findManyByUserId(userId)
    const productIdByName = new Map(
      existing.map((p) => [p.name.toLowerCase(), p.id]),
    )

    for (const sheetName of workbook.SheetNames) {
      const rows: unknown[][] = XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName],
        { header: 1, raw: false },
      )
      if (rows.length < 2) continue

      // Array.from densifica os "buracos" (colunas vazias viram string vazia).
      const header = Array.from(rows[0], (h) => String(h ?? '').trim().toLowerCase())
      const col = (label: string) =>
        header.findIndex((h) => h.startsWith(label))

      const idx = {
        date: col('data'),
        order: col('número do pedido'),
        account: col('conta'),
        marketplace: col('cia'),
        format: col('formato'),
        product: col('produto'),
        quantity: col('quantidade'),
        unitValue: header.findIndex(
          (h) => h.startsWith('valor pago por unidade') || h === 'valor pago',
        ),
        paymentMethod: col('forma de pagamento'),
        bankCard: col('banco/cartão'),
        accrual: col('acumulo/cashback'),
        freight: col('frete'),
        cpm: col('valor do cpm'),
        productExpected: col('previsão de recebimento'),
        productReceived: col('data de recebimento de produto'),
        creditExpected: col('data prevista de recebimento das milhas'),
        creditReceived: col('data de recebimento das milhas'),
        creditStatus: col('status das milhas'),
        unitData: col('dados do produto'),
        note: col('observação'),
      }

      for (const [lineIndex, row] of rows.slice(1).entries()) {
        const line = lineIndex + 2 // 1-based + header
        const cell = (i: number) => (i >= 0 ? row[i] : undefined)

        const cells = Array.from(row)
        const isEmpty = cells.every((c) => c === null || c === undefined || c === '')
        if (isEmpty) continue

        const productName = String(cell(idx.product) ?? '').trim()
        const dateISO = parseBRDate(cell(idx.date))
        const unitValueInCents = parseMoneyToCents(cell(idx.unitValue))

        if (!productName) {
          report.skipped.push({ sheet: sheetName, line, reason: 'sem produto' })
          continue
        }
        if (!dateISO) {
          report.skipped.push({ sheet: sheetName, line, reason: 'data inválida' })
          continue
        }
        if (!unitValueInCents) {
          report.skipped.push({ sheet: sheetName, line, reason: 'sem valor pago' })
          continue
        }

        try {
          let productId = productIdByName.get(productName.toLowerCase())
          if (!productId) {
            const product = await this.productsRepository.create({
              userId,
              name: productName,
            })
            productId = product.id
            productIdByName.set(productName.toLowerCase(), productId)
          }

          const format = mapFormat(cell(idx.format))
          const accrual = Number(String(cell(idx.accrual) ?? '0').replace(',', '.')) || 0
          const quantity = Math.max(
            1,
            Number(String(cell(idx.quantity) ?? '1')) || 1,
          )

          const { purchase } = await this.purchasesUseCase.create(userId, {
            productId,
            date: dateISO,
            quantity,
            unitValueInCents,
            freightInCents: parseMoneyToCents(cell(idx.freight)) ?? 0,
            orderNumber: String(cell(idx.order) ?? '').trim() || null,
            account: String(cell(idx.account) ?? '').trim() || null,
            marketplace: String(cell(idx.marketplace) ?? '').trim() || null,
            format,
            paymentMethod: String(cell(idx.paymentMethod) ?? '').trim() || null,
            bankCard: String(cell(idx.bankCard) ?? '').trim() || null,
            accrualPerReal: format === 'MILES' ? accrual : null,
            cashbackPercent: format === 'CASHBACK' ? accrual : null,
            cpmInCents: parseMoneyToCents(cell(idx.cpm)) || null,
            productExpectedAt: parseBRDate(cell(idx.productExpected)),
            creditExpectedAt: parseBRDate(cell(idx.creditExpected)),
            note: String(cell(idx.note) ?? '').trim() || null,
          })

          // Recebimento do produto (se a planilha diz que chegou)
          const receivedISO = parseBRDate(cell(idx.productReceived))
          if (receivedISO) {
            const unitData = parseUnitData(cell(idx.unitData))
            await this.purchasesUseCase.receiveProduct(
              userId,
              purchase.id,
              receivedISO,
              purchase.units[0]
                ? [{ unitId: purchase.units[0].id, ...unitData }]
                : undefined,
            )
          }

          // Crédito das milhas/cashback (se a planilha diz que caiu)
          const creditedISO = parseBRDate(cell(idx.creditReceived))
          const creditedByStatus = String(cell(idx.creditStatus) ?? '')
            .toUpperCase()
            .includes('CREDITADAS')
            && !String(cell(idx.creditStatus) ?? '').toUpperCase().includes('NÃO')
          if (
            (format === 'MILES' || format === 'CASHBACK') &&
            (creditedISO || creditedByStatus)
          ) {
            await this.purchasesUseCase.confirmCredit(
              userId,
              purchase.id,
              creditedISO ?? dateISO,
            )
          }

          report.imported += 1
        } catch (error) {
          report.skipped.push({
            sheet: sheetName,
            line,
            reason: error instanceof Error ? error.message : 'erro desconhecido',
          })
        }
      }
    }

    return report
  }
}
