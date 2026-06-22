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

    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL DEFAULT '',
        phone VARCHAR(15) NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, contact_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_contact_id ON contacts(contact_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone_like ON users(phone varchar_pattern_ops);
    `);

    logger.info('Esquema de base de datos inicializado');
  } finally {
    client.release();
  }
}
