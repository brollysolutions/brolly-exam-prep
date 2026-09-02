/** Join NativeWind class names, dropping falsy entries. */
export function cx(...parts: (string | false | null | undefined)[]): string | undefined {
  const out = parts.filter(Boolean).join(' ');
  return out.length ? out : undefined;
}
