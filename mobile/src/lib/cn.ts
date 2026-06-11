// Junta classes NativeWind (ignora valores falsy). Sem deps.
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ')
}
