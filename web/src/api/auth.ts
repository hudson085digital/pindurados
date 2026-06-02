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
}

export async function getProfile() {
  const response = await api.get<{ user: Profile }>('/me')
  return response.data.user
}
