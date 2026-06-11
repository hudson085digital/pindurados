import { SaleShareLink } from '@prisma/client'

export interface ShareLinksRepository {
  findByToken(token: string): Promise<SaleShareLink | null>
  findBySaleId(saleId: string): Promise<SaleShareLink | null>
  /** Cria o link da venda ou ROTACIONA: novo token, revoked=false, expiresAt atualizado. */
  upsertForSale(
    saleId: string,
    token: string,
    expiresAt: Date | null,
  ): Promise<SaleShareLink>
  /** Revoga o link da venda (invalida imediatamente). No-op se não existir. */
  revoke(saleId: string): Promise<void>
}
