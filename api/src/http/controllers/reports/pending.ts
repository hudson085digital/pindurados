import { FastifyReply, FastifyRequest } from 'fastify'
import { makePendingPanelUseCase } from '@/use-cases/factories/make-pending-panel-use-case'

// Painel de pendências da loja (025): produtos não recebidos e
// milhas/cashback não creditados, com estatísticas.
export async function pending(request: FastifyRequest, reply: FastifyReply) {
  const panel = await makePendingPanelUseCase().execute(request.user.sub)
  return reply.status(200).send(panel)
}
