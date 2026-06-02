import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { PrismaPixKeysRepository } from '@/repositories/prisma/prisma-pix-keys-repository'
import { BuildChargeMessageUseCase } from '../build-charge-message'

export function makeBuildChargeMessageUseCase() {
  return new BuildChargeMessageUseCase(
    new PrismaSalesRepository(),
    new PrismaPixKeysRepository(),
  )
}
