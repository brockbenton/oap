import 'dotenv/config';
import { createApp } from './app';
import { startMintWorker } from './jobs/mint.job';
import logger from './lib/logger';

const required = [
  'DATABASE_URL',
  'REDIS_URL',
  'ALCHEMY_API_KEY',
  'CONTRACT_ADDRESS',
  'RELAY_PRIVATE_KEY',
  'ADMIN_SIGNER_PRIVATE_KEY',
  'PRIVY_APP_ID',
  'PRIVY_APP_SECRET',
] as const;

for (const key of required) {
  if (!process.env[key]) {
    logger.error({ msg: `Missing required environment variable: ${key}` });
    process.exit(1);
  }
}

const app = createApp();

const PORT = parseInt(process.env.PORT ?? '3001');

app.listen(PORT, () => {
  logger.info({ msg: `Backend listening on port ${PORT}` });
  startMintWorker();
});

export default app;
