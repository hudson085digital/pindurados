import { Prisma, UserOption, UserOptionKind } from '@prisma/client'

export interface UserOptionsRepository {
  create(data: Prisma.UserOptionUncheckedCreateInput): Promise<UserOption>
  createMany(data: Prisma.UserOptionUncheckedCreateInput[]): Promise<void>
  findById(id: string): Promise<UserOption | null>
  findManyByUserId(
    userId: string,
    kind?: UserOptionKind,
  ): Promise<UserOption[]>
  countByUserId(userId: string, kind: UserOptionKind): Promise<number>
  delete(id: string): Promise<void>
}
