import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryShareLinksRepository } from '@/repositories/in-memory/in-memory-share-links-repository'
import { InMemorySalesRepository } from '@/repositories/in-memory/in-memory-sales-repository'
import { InMemoryPixKeysRepository } from '@/repositories/in-memory/in-memory-pix-keys-repository'
import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'
import { GetPublicSaleUseCase } from './get-public-sale'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

const USER_ID = 'user-1'

let shareLinks: InMemoryShareLinksRepository
let sales: InMemorySalesRepository
let pixKeys: InMemoryPixKeysRepository
let users: InMemoryUsersRepository
let sut: GetPublicSaleUseCase

beforeEach(() => {
  shareLinks = new InMemoryShareLinksRepository()
  sales = new InMemorySalesRepository()
  pixKeys = new InMemoryPixKeysRepository()
  users = new InMemoryUsersRepository()
  sut = new GetPublicSaleUseCase(shareLinks, sales, pixKeys, users)

  users.items.push({
    id: USER_ID,
    name: 'Maria Credora',
    email: 'maria@x.com',
    passwordHash: 'x',
    role: 'ADMIN',
    contactPhone: null,
    createdAt: new Date(),
  })

  sales.seed(
    InMemorySalesRepository.makeSale({
      id: 'sale-1',
      totalInCents: 100000,
      installments: [
        {
          id: 'p1',
          number: 1,
          amountInCents: 100000,
          dueDate: new Date('2030-01-01'),
          isLate: false,
          lateInterestInCents: 0,
          lateFeePercent: null,
          lateReason: null,
          saleId: 'sale-1',
        },
      ],
      customer: {
        id: 'c1',
        name: 'João Devedor',
        phone: null,
        note: null,
        autoReminder: false,
        kind: null,
        cpfCnpj: null,
        instagram: null,
        tags: [],
        addressZip: null,
        addressStreet: null,
        addressNumber: null,
        addressDistrict: null,
        addressCity: null,
        addressState: null,
        addressComplement: null,
        createdAt: new Date(),
        userId: USER_ID,
      },
    }),
  )
})

describe('GetPublicSaleUseCase', () => {
  it('token ativo → devolve a visão pública da venda', async () => {
    await shareLinks.upsertForSale('sale-1', 'tok-ativo', null)

    const { sale } = await sut.execute({ token: 'tok-ativo' })

    expect(sale.customerName).toBe('João Devedor')
    expect(sale.creditorName).toBe('Maria Credora')
    expect(sale.totalInCents).toBe(100000)
  })

  it('token inexistente → ResourceNotFoundError (404)', async () => {
    await expect(() => sut.execute({ token: 'nao-existe' })).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    )
  })

  it('token revogado → ResourceNotFoundError (404)', async () => {
    await shareLinks.upsertForSale('sale-1', 'tok-rev', null)
    await shareLinks.revoke('sale-1')

    await expect(() => sut.execute({ token: 'tok-rev' })).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    )
  })

  it('token expirado → ResourceNotFoundError (404)', async () => {
    await shareLinks.upsertForSale('sale-1', 'tok-exp', new Date('2020-01-01'))

    await expect(() => sut.execute({ token: 'tok-exp' })).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    )
  })

  it('inclui PIX padrão do dono quando existe', async () => {
    await pixKeys.create({
      type: 'EMAIL',
      key: 'maria@x.com',
      bankName: 'Nubank',
      holderName: 'Maria',
      isDefault: true,
      userId: USER_ID,
    })
    await shareLinks.upsertForSale('sale-1', 'tok-pix', null)

    const { sale } = await sut.execute({ token: 'tok-pix' })
    expect(sale.pix?.key).toBe('maria@x.com')
  })
})
