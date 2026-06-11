import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { makeUpdateUserProfileUseCase } from '@/use-cases/factories/make-update-user-profile-use-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export async function updateProfile(request: FastifyRequest, reply: FastifyReply) {
  const bodySchema = z.object({
    contactPhone: z.string().nullish(),
  })
  const { contactPhone } = bodySchema.parse(request.body)

  try {
    const updateUserProfile = makeUpdateUserProfileUseCase()
    const { user } = await updateUserProfile.execute({
      userId: request.user.sub,
      contactPhone,
    })

    return reply.status(200).send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        contactPhone: user.contactPhone,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}
