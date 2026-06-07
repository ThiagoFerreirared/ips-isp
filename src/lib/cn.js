// Junta classes condicionalmente. Aceita strings, arrays e valores falsy.
export function cn(...args) {
  return args.flat(Infinity).filter(Boolean).join(" ");
}
