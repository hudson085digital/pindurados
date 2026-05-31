export class ResourceNotFoundError extends Error {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado(a).`)
  }
}
