import { pgPool } from './postgres';
import { logger } from '../lib/logger';

export async function initSchema(): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        phone VARCHAR(15) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL DEFAULT '',
        bio VARCHAR(160) NOT NULL DEFAULT '',
        avatar_url TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    logger.info('Esquema de base de datos inicializado');
  } finally {
    client.release();
  }
}
