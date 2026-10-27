import fs from 'node:fs';
import path from 'node:path';
import { privateKeyToAccount } from 'viem/accounts';
import { readEnvFile, setEnvVar, isPlaceholder, envStatus } from './lib/envfile';

// Prints key names, SET/MISSING status, HTTP status and addresses only. Never a secret value.

const root = path.resolve(__dirname, '..', '..');
const rootEnv = path.join(root, '.env');
const backendEnv = path.join(root, 'backend', '.env');
const backendExample = path.join(root, 'backend', '.env.example');
const contractEnv = path.join(root, 'smart-contract', '.env');
const frontendEnv = path.join(root, 'frontend', '.env.local');

function setIfEmpty(file: string, key: string, value: string): void {
  if (isPlaceholder(readEnvFile(file).get(key))) setEnvVar(file, key, value);
}

async function probeAlchemy(key: string): Promise<number | 'OK'> {
  try {
    const res = await fetch(`https://base-sepolia.g.alchemy.com/v2/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId' }),
    });
    if (res.status !== 200) return res.status;
    const json = (await res.json()) as { result?: string };
    return json.result === '0x14a34' ? 'OK' : res.status;
  } catch {
    return 0;
  }
}

async function bootstrap(): Promise<void> {
  const addresses = JSON.parse(fs.readFileSync(path.join(root, 'addresses.json'), 'utf8')) as {
    AttendanceRegistry: Record<string, string>;
  };
  const contract = addresses.AttendanceRegistry['base-sepolia'];

  if (!fs.existsSync(backendEnv)) fs.copyFileSync(backendExample, backendEnv);
  fs.chmodSync(backendEnv, 0o600);
  setIfEmpty(backendEnv, 'DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/onchain_attendance');
  setIfEmpty(backendEnv, 'REDIS_URL', 'redis://localhost:6379');
  setIfEmpty(backendEnv, 'CHAIN_ID', '84532');
  setIfEmpty(backendEnv, 'NODE_ENV', 'development');
  setIfEmpty(backendEnv, 'CONTRACT_ADDRESS', contract);
  setIfEmpty(backendEnv, 'QR_TTL_MS', '30000');
  setIfEmpty(backendEnv, 'PORT', '3001');

  if (fs.existsSync(rootEnv)) {
    const lines = fs.readFileSync(rootEnv, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i + 1 < lines.length; i += 2) {
      const label = lines[i];
      const value = lines[i + 1];
      if (/^0x?[0-9a-fA-F]{64}$/.test(value)) {
        const hex = (value.startsWith('0x') ? value : `0x${value}`) as `0x${string}`;
        console.log(`${label} -> private key for ${privateKeyToAccount(hex).address}`);
        setIfEmpty(backendEnv, 'CANDIDATE_DEPLOYER_PRIVATE_KEY', hex);
        continue;
      }
      const probe = value.includes(' ') ? 0 : await probeAlchemy(value);
      if (probe === 'OK') {
        console.log(`${label} -> Alchemy key`);
        setIfEmpty(backendEnv, 'ALCHEMY_API_KEY', value);
        setEnvVarSafe(contractEnv, 'ALCHEMY_API_KEY', value);
      } else {
        console.log(`${label} -> UNIDENTIFIED (${value.length} chars)`);
      }
    }
  }

  const be = readEnvFile(backendEnv);
  if (!isPlaceholder(be.get('ALCHEMY_API_KEY'))) setEnvVarSafe(contractEnv, 'ALCHEMY_API_KEY', be.get('ALCHEMY_API_KEY')!);

  if (!fs.existsSync(frontendEnv)) fs.writeFileSync(frontendEnv, '', { mode: 0o600 });
  setIfEmpty(frontendEnv, 'NEXT_PUBLIC_CHAIN_ID', '84532');
  setIfEmpty(frontendEnv, 'NEXT_PUBLIC_API_URL', 'http://localhost:3001');
  setIfEmpty(frontendEnv, 'NEXT_PUBLIC_CONTRACT_ADDRESS', contract);
  if (!isPlaceholder(be.get('PRIVY_APP_ID'))) setIfEmpty(frontendEnv, 'NEXT_PUBLIC_PRIVY_APP_ID', be.get('PRIVY_APP_ID')!);
}

function setEnvVarSafe(file: string, key: string, value: string): void {
  if (isPlaceholder(readEnvFile(file).get(key))) setEnvVar(file, key, value);
}

async function status(): Promise<void> {
  const rows = [
    ...envStatus(backendEnv, [
      'DATABASE_URL', 'REDIS_URL', 'ALCHEMY_API_KEY', 'CONTRACT_ADDRESS', 'CHAIN_ID', 'PRIVY_APP_ID',
      'PRIVY_APP_SECRET', 'RELAY_PRIVATE_KEY', 'ADMIN_SIGNER_PRIVATE_KEY', 'DEFAULT_ADMIN_PRIVATE_KEY',
    ]).map((r) => ({ ...r, file: 'backend/.env' })),
    ...envStatus(frontendEnv, ['NEXT_PUBLIC_PRIVY_APP_ID', 'NEXT_PUBLIC_CONTRACT_ADDRESS']).map((r) => ({
      ...r,
      file: 'frontend/.env.local',
    })),
  ];
  for (const r of rows) console.log(`${r.key.padEnd(30)} ${r.status.padEnd(12)} (${r.file})`);

  const be = readEnvFile(backendEnv);
  const fe = readEnvFile(frontendEnv);
  const ak = be.get('ALCHEMY_API_KEY');
  if (isPlaceholder(ak)) {
    console.log('ALCHEMY_API_KEY probe: FAIL missing');
  } else {
    const p = await probeAlchemy(ak!);
    console.log(p === 'OK' ? 'ALCHEMY_API_KEY probe: OK' : `ALCHEMY_API_KEY probe: FAIL ${p}`);
  }
  const bp = be.get('PRIVY_APP_ID');
  const fp = fe.get('NEXT_PUBLIC_PRIVY_APP_ID');
  const match = isPlaceholder(bp) || isPlaceholder(fp) ? 'MISSING' : bp === fp ? 'MATCH' : 'MISMATCH';
  console.log(`PRIVY_APP_ID frontend/backend: ${match}`);
}

(async () => {
  if (!process.argv.includes('--status')) await bootstrap();
  await status();
})().catch((err) => {
  console.error('bootstrap-env failed:', err instanceof Error ? err.name : 'error');
  process.exit(1);
});
