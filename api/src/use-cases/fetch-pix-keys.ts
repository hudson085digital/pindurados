import { PixKey } from '@prisma/client'
import { PixKeysRepository } from '@/repositories/pix-keys-repository'

interface FetchPixKeysUseCaseRequest {
  userId: string
}

interface FetchPixKeysUseCaseResponse {
  pixKeys: PixKey[]
}

export class FetchPixKeysUseCase {
  constructor(private pixKeysRepository: PixKeysRepository) {}

  async execute({
    userId,
  }: FetchPixKeysUseCaseRequest): Promise<FetchPixKeysUseCaseResponse> {
    const pixKeys = await this.pixKeysRepository.findManyByUserId(userId)
    return { pixKeys }
  }
}
