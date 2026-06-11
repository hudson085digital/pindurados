import { User } from '@prisma/client'
import { UsersRepository } from '@/repositories/users-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface UpdateUserProfileUseCaseRequest {
  userId: string
  contactPhone?: string | null
}

interface UpdateUserProfileUseCaseResponse {
  user: User
}

export class UpdateUserProfileUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({
    userId,
    contactPhone,
  }: UpdateUserProfileUseCaseRequest): Promise<UpdateUserProfileUseCaseResponse> {
    const user = await this.usersRepository.findById(userId)
    if (!user) {
      throw new ResourceNotFoundError('Usuário')
    }

    const data: { contactPhone?: string | null } = {}
    // Só altera se o campo veio na requisição; string vazia → limpa o contato (null).
    if (contactPhone !== undefined) {
      data.contactPhone = contactPhone ? contactPhone : null
    }

    const updated = await this.usersRepository.update(userId, data)
    return { user: updated }
  }
}
