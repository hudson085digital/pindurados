import fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { ZodError } from 'zod'
import { env } from '@/env'
import { UPLOADS_DIR } from '@/lib/uploads'
import { usersRoutes } from '@/http/controllers/users/routes'
import { customersRoutes } from '@/http/controllers/customers/routes'
import { salesRoutes } from '@/http/controllers/sales/routes'
import { installmentsRoutes } from '@/http/controllers/installments/routes'
import { reportsRoutes } from '@/http/controllers/reports/routes'
import { pixKeysRoutes } from '@/http/controllers/pix-keys/routes'

export const app = fastify()

app.register(fastifyCors, {
  origin: true,
  credentials: true,
})

app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: 'refreshToken',
    signed: false,
  },
  sign: {
    expiresIn: '10m',
  },
})

app.register(fastifyCookie)
// Limite de 20MB por arquivo (fotos de celular); comprovantes são otimizados depois.
app.register(fastifyMultipart, { limits: { fileSize: 20 * 1024 * 1024 } })

// Comprovantes acessíveis em /comprovantes/<arquivo>
app.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: '/comprovantes/',
})

// Health check (público) — usado pelo monitoramento do host.
app.get('/health', () => ({ status: 'ok' }))

// Rotas
app.register(usersRoutes)
app.register(customersRoutes)
app.register(salesRoutes)
app.register(installmentsRoutes)
app.register(reportsRoutes)
app.register(pixKeysRoutes)

// Tratamento global de erros
app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    return reply
      .status(400)
      .send({ message: 'Dados inválidos.', issues: error.format() })
  }

  if (env.NODE_ENV !== 'production') {
    console.error(error)
  }

  return reply.status(500).send({ message: 'Erro interno do servidor.' })
})
