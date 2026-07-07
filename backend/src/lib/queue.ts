import { Queue } from 'bullmq';

export const MINT_QUEUE = 'mint';

export interface MintJobData {
  checkInId: string;
  memberAddress: `0x${string}`;
  sessionIdOnchain: string;
}

const connection = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  // Defer the Redis connection until the first enqueue so importing the app
  // (e.g. in tests) does not open a socket.
  lazyConnect: true,
};

export const mintQueue = new Queue<MintJobData>(MINT_QUEUE, { connection });
