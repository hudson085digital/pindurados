// API pública do @pindurados/core.
// Tipos e formatação vêm de seus módulos; do calc reexportamos as funções e
// interfaces próprias (SaleType/InstallmentStatus são canônicos em ./types).
export * from './types'
export * from './format'
export {
  calculateSale,
  allocateReceipts,
  sumReceipts,
  addMonthsISO,
  toISODate,
  isoToDate,
  redistribute,
} from './calc'
export type {
  CalculateSaleInput,
  CalculateSaleResult,
  AllocatableInstallment,
  InstallmentAllocation,
  ReceiptsAllocation,
} from './calc'
