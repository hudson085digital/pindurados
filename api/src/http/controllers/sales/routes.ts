import { FastifyInstance } from 'fastify'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { calculate } from './calculate'
import { createSale } from './create'
import { saleDetails } from './details'
import { deleteSale } from './delete'
import { createReceipt } from './create-receipt'
import { voidReceipt } from './void-receipt'
import { chargeMessage } from './charge-message'

export async function salesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.post('/sales/calculate', calculate)
  app.post('/sales', createSale)
  app.get('/sales/:id', saleDetails)
  app.delete('/sales/:id', deleteSale)

  // Recebimentos (crediário)
  app.post('/sales/:saleId/receipts', createReceipt)
  app.post('/sales/:saleId/receipts/:receiptId/void', voidReceipt)

  // Mensagem de cobrança
  app.get('/sales/:saleId/charge-message', chargeMessage)
}
