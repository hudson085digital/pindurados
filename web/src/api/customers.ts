import { api } from '@/lib/axios'
import { Customer, CustomerWithBalance, Sale } from './types'

export async function fetchCustomers() {
  const response = await api.get<{ customers: CustomerWithBalance[] }>('/customers')
  return response.data.customers
}

export interface CustomerDetailsResponse {
  customer: Customer
  sales: Sale[]
  balanceInCents: number
}

export async function getCustomerDetails(id: string) {
  const response = await api.get<CustomerDetailsResponse>(`/customers/${id}`)
  return response.data
}

export interface CreateCustomerBody {
  name: string
  phone?: string | null
  note?: string | null
}

export async function createCustomer(body: CreateCustomerBody) {
  const response = await api.post<{ customer: Customer }>('/customers', body)
  return response.data.customer
}

export async function deleteCustomer(id: string) {
  await api.delete(`/customers/${id}`)
}
