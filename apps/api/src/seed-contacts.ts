import { pgPool } from './config/postgres';
import { randomUUID } from 'crypto';
import { logger } from './lib/logger';

const PHONES = {
  a: '+51999999991',
  b: '+51999999992',
};

const NAMES = {
  a: 'Usuario A',
  b: 'Usuario B',
};

async function ensureUser(phone: string, name: string): Promise<string> {
  const existing = await pgPool.query('SELECT id FROM users WHERE phone = $1', [phone]);
  if (existing.rows.length > 0) {
    logger.info({ phone, name }, 'Usuario ya existe');
    return existing.rows[0].id;
  }
  const id = randomUUID();
  await pgPool.query(
    `INSERT INTO users (id, phone, name) VALUES ($1, $2, $3)`,
    [id, phone, name],
  );
  logger.info({ id, phone, name }, 'Usuario creado');
  return id;
}

async function addContact(userId: string, contactId: string, phone: string, name: string) {
  await pgPool.query(
    `INSERT INTO contacts (user_id, contact_id, name, phone)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, contact_id) DO NOTHING`,
    [userId, contactId, name, phone],
  );
  logger.info({ userId, contactId }, 'Contacto agregado');
}

async function main() {
  const idA = await ensureUser(PHONES.a, NAMES.a);
  const idB = await ensureUser(PHONES.b, NAMES.b);

  await addContact(idA, idB, PHONES.b, NAMES.b);
  await addContact(idB, idA, PHONES.a, NAMES.a);

  logger.info('Contactos mutuos creados exitosamente');
  await pgPool.end();
}

main().catch((err) => {
  logger.error({ err }, 'Error');
  process.exit(1);
});
