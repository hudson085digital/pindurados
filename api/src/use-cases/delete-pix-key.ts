import { PixKeysRepository } from '@/repositories/pix-keys-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface DeletePixKeyUseCaseRequest {
  userId: string
  pixKeyId: string
}

export class DeletePixKeyUseCase {
  constructor(private pixKeysRepository: PixKeysRepository) {}

  async execute({ userId, pixKeyId }: DeletePixKeyUseCaseRequest): Promise<void> {
    const pixKey = await this.pixKeysRepository.findById(pixKeyId)
    if (!pixKey || pixKey.userId !== userId) {
      throw new ResourceNotFoundError('Chave Pix')
    }

    const wasDefault = pixKey.isDefault
    await this.pixKeysRepository.delete(pixKeyId)

    // Se a padrão saiu e ainda há chaves, promove a mais antiga (FR-005).
    if (wasDefault) {
      const remaining = await this.pixKeysRepository.findManyByUserId(userId)
      if (remaining.length > 0) {
        const oldest = remaining[0]
        oldest.isDefault = true
        await this.pixKeysRepository.save(oldest)
      }
    }
  }
}
