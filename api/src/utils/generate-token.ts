import { randomBytes } from 'node:crypto'

// Token aleatório não-adivinhável para links públicos (023).
// 32 bytes = 256 bits de entropia, em base64url (~43 chars, seguro para URL).
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}
