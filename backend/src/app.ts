// Patches Express 4 to forward async handler rejections to the error middleware
// (Express 4 does not do this natively — see AUDIT.md). Must load before routers.
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import sessionsRouter from './routes/sessions';
import checkInRouter from './routes/check-in';
import adminRouter from './routes/admin';
import membersRouter from './routes/members';
import logger from './lib/logger';

/** Builds the Express app (no listener / worker) so tests can import it directly. */
export function createApp() {
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

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ msg: 'Unhandled error', err: err.message });
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  });

  return app;
}
