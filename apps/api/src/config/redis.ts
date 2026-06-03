import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../lib/logger';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

export async function connectRedis(): Promise<void> {
  await redis.connect();
  await redis.ping();
  logger.info('Redis conectado');
}
