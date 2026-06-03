import { pgPool } from './config/postgres';
import { randomUUID } from 'crypto';
import { logger } from './lib/logger';

const SEED_USERS = [
  { phone: '+51999000001', name: 'Ana Garcia' },
  { phone: '+51999000002', name: 'Carlos Lopez' },
  { phone: '+51999000003', name: 'Maria Torres' },
  { phone: '+51999000004', name: 'Pedro Quispe' },
  { phone: '+51999000005', name: 'Lucia Mendoza' },
];

async function seed() {
  logger.info('Iniciando seed de usuarios');

  for (const u of SEED_USERS) {
    const existing = await pgPool.query('SELECT id FROM users WHERE phone = $1', [u.phone]);
    if (existing.rows.length > 0) {
      logger.info({ phone: u.phone, name: u.name }, 'Usuario ya existe, saltando');
      continue;
    }

    const id = randomUUID();
    await pgPool.query(
      `INSERT INTO users (id, phone, name) VALUES ($1, $2, $3)`,
      [id, u.phone, u.name],
    );
    logger.info({ userId: id, phone: u.phone, name: u.name }, 'Usuario seed creado');
  }

  logger.info('Seed completado');
  await pgPool.end();
}

seed().catch((err) => {
  logger.error({ err }, 'Error en seed');
  process.exit(1);
});
