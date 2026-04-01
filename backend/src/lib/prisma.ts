import { PrismaClient } from '@prisma/client';
import logger from './logger';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (e) => logger.error({ msg: 'Prisma error', ...e }));
prisma.$on('warn', (e) => logger.warn({ msg: 'Prisma warning', ...e }));

export default prisma;
