import { FastifyInstance } from 'fastify'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { calculate } from './calculate'
import { createSale } from './create'
import { saleDetails } from './details'
import { updateSale } from './update'
import { deleteSale } from './delete'
import { createReceipt } from './create-receipt'
import { updateReceipt } from './update-receipt'
import { voidReceipt } from './void-receipt'
import { chargeMessage } from './charge-message'
import { createShareLink, getShareLink, revokeShareLink } from './share-link'

export async function salesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.post('/sales/calculate', calculate)
  app.post('/sales', createSale)
  app.get('/sales/:id', saleDetails)
  app.put('/sales/:id', updateSale)
  app.delete('/sales/:id', deleteSale)

  // Recebimentos (crediário)
  app.post('/sales/:saleId/receipts', createReceipt)
  app.put('/sales/:saleId/receipts/:receiptId', updateReceipt)
  app.post('/sales/:saleId/receipts/:receiptId/void', voidReceipt)

  // Mensagem de cobrança
  app.get('/sales/:saleId/charge-message', chargeMessage)

  // Link público da venda (gerar/rotacionar, estado, revogar) — 023
  app.post('/sales/:id/share-link', createShareLink)
  app.get('/sales/:id/share-link', getShareLink)
  app.delete('/sales/:id/share-link', revokeShareLink)
}
