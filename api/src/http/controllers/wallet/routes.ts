import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { prisma } from '@/lib/prisma'
import { BusinessRuleError } from '@/use-cases/errors/business-rule-error'

// Carteira de cashback (025): saldo = soma dos lançamentos. Crédito entra ao
// confirmar o cashback da compra; sai por saque ou uso em compra futura.
async function balanceOf(userId: string) {
  const agg = await prisma.walletEntry.aggregate({
    where: { userId },
    _sum: { amountInCents: true },
  })
  return agg._sum.amountInCents ?? 0
}

async function getWallet(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub
  const [balanceInCents, entries] = await Promise.all([
    balanceOf(userId),
    prisma.walletEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { purchase: { include: { product: true } } },
    }),
  ])
  return reply.send({
    balanceInCents,
    entries: entries.map((e) => ({
      id: e.id,
      amountInCents: e.amountInCents,
      kind: e.kind,
      note: e.note,
      createdAt: e.createdAt,
      productName: e.purchase?.product.name ?? null,
    })),
  })
}

// Saque: sai da carteira; contabilmente é receita sem custo (lucro puro).
async function withdraw(request: FastifyRequest, reply: FastifyReply) {
  const { amountInCents, note } = z
    .object({
      amountInCents: z.coerce.number().int().positive(),
      note: z.string().trim().nullish(),
    })
    .parse(request.body)

  const userId = request.user.sub
  const balance = await balanceOf(userId)
  if (amountInCents > balance) {
    throw new BusinessRuleError(
      `Saldo insuficiente na carteira (disponível: R$ ${(balance / 100).toFixed(2).replace('.', ',')}).`,
    )
  }
  const entry = await prisma.walletEntry.create({
    data: {
      userId,
      amountInCents: -amountInCents,
      kind: 'Saque',
      note: note ?? null,
    },
  })
  return reply.status(201).send({ entry, balanceInCents: balance - amountInCents })
}

export async function walletRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.get('/wallet', getWallet)
  app.post('/wallet/withdraw', withdraw)
}
