import { api } from '@/lib/axios'

export interface SignInBody {
  email: string
  password: string
}

export async function signIn({ email, password }: SignInBody) {
  const response = await api.post<{ token: string }>('/sessions', {
    email,
    password,
  })
  return response.data
}

export interface SignUpBody {
  name: string
  email: string
  password: string
}

export async function signUp({ name, email, password }: SignUpBody) {
  await api.post('/users', { name, email, password })
}

export interface Profile {
  id: string
  name: string
  email: string
  role: string
  contactPhone?: string | null
}

export async function getProfile() {
  const response = await api.get<{ user: Profile }>('/me')
  return response.data.user
}

// Atualiza o perfil do dono (ex.: telefone de contato para a página pública — 023).
export async function updateProfile(body: { contactPhone?: string | null }) {
  const response = await api.patch<{ user: Profile }>('/me', body)
  return response.data.user
}
