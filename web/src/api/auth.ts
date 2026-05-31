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
