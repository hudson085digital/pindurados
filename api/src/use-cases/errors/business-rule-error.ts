// Erro de regra de negócio — vira HTTP 400 no controller.
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BusinessRuleError'
  }
}
