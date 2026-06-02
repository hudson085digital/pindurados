import { PixKey, PixKeyType } from '@prisma/client'
import { PixKeysRepository } from '@/repositories/pix-keys-repository'

interface CreatePixKeyUseCaseRequest {
  userId: string
  type: PixKeyType
  key: string
  bankName: string
  holderName: string
  makeDefault?: boolean
}

interface CreatePixKeyUseCaseResponse {
  pixKey: PixKey
}

export class CreatePixKeyUseCase {
  constructor(private pixKeysRepository: PixKeysRepository) {}

  async execute({
    userId,
    type,
    key,
    bankName,
    holderName,
    makeDefault,
  }: CreatePixKeyUseCaseRequest): Promise<CreatePixKeyUseCaseResponse> {
    const existing = await this.pixKeysRepository.findManyByUserId(userId)

    // A primeira chave vira padrão automaticamente (FR-004).
    const shouldBeDefault = makeDefault === true || existing.length === 0

    if (shouldBeDefault) {
      await this.pixKeysRepository.clearDefault(userId)
    }

    const pixKey = await this.pixKeysRepository.create({
      userId,
      type,
      key,
      bankName,
      holderName,
      isDefault: shouldBeDefault,
    })

    return { pixKey }
  }
}
