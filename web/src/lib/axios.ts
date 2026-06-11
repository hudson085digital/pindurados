import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

// Cliente PÚBLICO (023): sem cookies, sem Bearer e sem redirecionar no 401.
// Usado pela página /p/:token, que não depende de login.
export const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
})

// Anexa o token salvo a cada requisição.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pindurados.token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Se a sessão expirar (401), volta pro login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('pindurados.token')
      if (!window.location.pathname.startsWith('/sign-in')) {
        window.location.href = '/sign-in'
      }
    }
    return Promise.reject(error)
  },
)
