import { PixKey } from '@prisma/client'
import { PixKeysRepository } from '@/repositories/pix-keys-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface SetDefaultPixKeyUseCaseRequest {
  userId: string
  pixKeyId: string
}

interface SetDefaultPixKeyUseCaseResponse {
  pixKey: PixKey
}

export class SetDefaultPixKeyUseCase {
  constructor(private pixKeysRepository: PixKeysRepository) {}

  async execute({
    userId,
    pixKeyId,
  }: SetDefaultPixKeyUseCaseRequest): Promise<SetDefaultPixKeyUseCaseResponse> {
    const pixKey = await this.pixKeysRepository.findById(pixKeyId)
    if (!pixKey || pixKey.userId !== userId) {
      throw new ResourceNotFoundError('Chave Pix')
    }

    await this.pixKeysRepository.clearDefault(userId)
    pixKey.isDefault = true
    const updated = await this.pixKeysRepository.save(pixKey)

    return { pixKey: updated }
  }
}
