import { hash } from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

// Cria o usuário inicial do Hudson para login. Rode: pnpm db:seed
async function main() {
  const email = 'hudson@pindurados.local'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('Usuário já existe:', email)
    return
  }

  await prisma.user.create({
    data: {
      name: 'Hudson',
      email,
      passwordHash: await hash('pindurados123', 6),
      role: 'ADMIN',
    },
  })

  console.log('Usuário criado!')
  console.log('  e-mail:', email)
  console.log('  senha : pindurados123  (troque depois)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
