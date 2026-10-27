import fs from 'node:fs';
import { parse } from 'dotenv';

/** Parses an env file into a Map; a missing file yields an empty map. */
export function readEnvFile(path: string): Map<string, string> {
  if (!fs.existsSync(path)) return new Map();
  return new Map(Object.entries(parse(fs.readFileSync(path))));
}

export function isPlaceholder(value: string | undefined): boolean {
  return (
    value === undefined ||
    value.trim() === '' ||
    value === '0x...' ||
    value.startsWith('your_') ||
    value.includes('user:password')
  );
}

/** Replaces `KEY=` line (or appends) while preserving every other line. File mode 0600. */
export function setEnvVar(path: string, key: string, value: string): void {
  const existing = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
  const lines = existing === '' ? [] : existing.replace(/\n$/, '').split('\n');
  const re = new RegExp(`^\\s*${key}\\s*=`);
  const idx = lines.findIndex((l) => re.test(l));
  if (idx >= 0) lines[idx] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
  fs.writeFileSync(path, lines.join('\n') + '\n', { mode: 0o600 });
  fs.chmodSync(path, 0o600);
}

/** Reports SET / MISSING / PLACEHOLDER per key. Never returns values. */
export function envStatus(
  path: string,
  keys: string[],
): Array<{ key: string; status: 'SET' | 'MISSING' | 'PLACEHOLDER' }> {
  const env = readEnvFile(path);
  return keys.map((key) => {
    if (!env.has(key)) return { key, status: 'MISSING' as const };
    return { key, status: isPlaceholder(env.get(key)) ? ('PLACEHOLDER' as const) : ('SET' as const) };
  });
}
