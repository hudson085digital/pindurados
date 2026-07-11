// 025 — campos extras do comprador (todos opcionais; design aberto).
export interface CustomerExtraFields {
  /** Rótulo livre (UserOption CUSTOMER_KIND). */
  kind?: string | null
  cpfCnpj?: string | null
  instagram?: string | null
  tags?: string[]
  addressZip?: string | null
  addressStreet?: string | null
  addressNumber?: string | null
  addressDistrict?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressComplement?: string | null
}

export const CUSTOMER_EXTRA_KEYS = [
  'kind',
  'cpfCnpj',
  'instagram',
  'tags',
  'addressZip',
  'addressStreet',
  'addressNumber',
  'addressDistrict',
  'addressCity',
  'addressState',
  'addressComplement',
] as const
