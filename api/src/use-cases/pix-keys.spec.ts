import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryPixKeysRepository } from '@/repositories/in-memory/in-memory-pix-keys-repository'
import { CreatePixKeyUseCase } from './create-pix-key'
import { SetDefaultPixKeyUseCase } from './set-default-pix-key'
import { DeletePixKeyUseCase } from './delete-pix-key'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

const USER = 'user-1'

let repo: InMemoryPixKeysRepository
let create: CreatePixKeyUseCase
let setDefault: SetDefaultPixKeyUseCase
let del: DeletePixKeyUseCase

beforeEach(() => {
  repo = new InMemoryPixKeysRepository()
  create = new CreatePixKeyUseCase(repo)
  setDefault = new SetDefaultPixKeyUseCase(repo)
  del = new DeletePixKeyUseCase(repo)
})

function newKey(over = {}) {
  return create.execute({
    userId: USER,
    type: 'CPF',
    key: '000.000.000-00',
    bankName: 'Banco X',
    holderName: 'Hudson',
    ...over,
  })
}

describe('Chaves Pix', () => {
  it('a primeira chave vira padrão automaticamente', async () => {
    const { pixKey } = await newKey()
    expect(pixKey.isDefault).toBe(true)
  })

  it('sempre há no máximo uma padrão (definir nova limpa a antiga)', async () => {
    const { pixKey: a } = await newKey()
    const { pixKey: b } = await newKey({ key: 'b@email.com', type: 'EMAIL' })

    expect(b.isDefault).toBe(false) // não pediu para ser padrão
    await setDefault.execute({ userId: USER, pixKeyId: b.id })

    const keys = await repo.findManyByUserId(USER)
    const defaults = keys.filter((k) => k.isDefault)
    expect(defaults).toHaveLength(1)
    expect(defaults[0].id).toBe(b.id)
    expect(keys.find((k) => k.id === a.id)!.isDefault).toBe(false)
  })

  it('criar com makeDefault marca como padrão e limpa a anterior', async () => {
    await newKey()
    const { pixKey: b } = await newKey({ makeDefault: true, key: 'b' })
    const defaults = (await repo.findManyByUserId(USER)).filter((k) => k.isDefault)
    expect(defaults).toHaveLength(1)
    expect(defaults[0].id).toBe(b.id)
  })

  it('excluir a padrão promove a mais antiga restante', async () => {
    const { pixKey: a } = await newKey()
    await newKey({ key: 'b' })
    await del.execute({ userId: USER, pixKeyId: a.id }) // a era a padrão

    const keys = await repo.findManyByUserId(USER)
    expect(keys).toHaveLength(1)
    expect(keys[0].isDefault).toBe(true)
  })

  it('não mexe em chave de outro usuário', async () => {
    const { pixKey } = await newKey()
    await expect(() =>
      setDefault.execute({ userId: 'outro', pixKeyId: pixKey.id }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
