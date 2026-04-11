import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sessionsRouter from './routes/sessions';
import checkInRouter from './routes/check-in';
import adminRouter from './routes/admin';
import membersRouter from './routes/members';
import { startMintWorker } from './jobs/mint.job';
import logger from './lib/logger';

// Validate required env vars at startup
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

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/sessions', sessionsRouter);
app.use('/api/v1/check-in', checkInRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/members', membersRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Global error handler — never leak internals
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ msg: 'Unhandled error', err: err.message });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

const PORT = parseInt(process.env.PORT ?? '3001');

app.listen(PORT, () => {
  logger.info({ msg: `Backend listening on port ${PORT}` });
  startMintWorker();
});

export default app;
