import { FastifyReply, FastifyRequest } from 'fastify'
import { makeGetDashboardUseCase } from '@/use-cases/factories/make-get-dashboard-use-case'

export async function dashboard(request: FastifyRequest, reply: FastifyReply) {
  const getDashboard = makeGetDashboardUseCase()
  const data = await getDashboard.execute({ userId: request.user.sub })

  return reply.status(200).send(data)
}
