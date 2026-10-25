/** A set, non-blank environment variable. A missing or blank value stays unset. */
export function readEnv(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}
