import { execSync } from 'node:child_process';
import { TEST_ENV } from './testEnv';

// Runs once before the suite: (re)creates the test DB, applies the schema, seeds it.
// seed.ts loads dotenv, but dotenv does not override already-set vars, so the
// DATABASE_URL passed here wins over the dev .env.
export default function setup(): void {
  const env = { ...process.env, ...TEST_ENV };

  try {
    execSync('createdb onchain_attendance_test', { stdio: 'ignore' });
  } catch {
    // already exists — fine
  }

  execSync('npx prisma db push --skip-generate --force-reset', { env, stdio: 'inherit' });
  execSync('npx tsx prisma/seed.ts', { env, stdio: 'inherit' });
}
