import { Pool } from 'pg';
import { env } from './env';
import { logger } from '../lib/logger';

export const pgPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function connectPostgres(): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query('SELECT NOW()');
    logger.info('PostgreSQL conectado');
  } finally {
    client.release();
  }
}
