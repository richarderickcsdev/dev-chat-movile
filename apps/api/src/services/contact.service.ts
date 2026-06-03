import { pgPool } from '../config/postgres';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';

export interface Contact {
  id: string;
  user_id: string;
  contact_id: string;
  name: string;
  phone: string;
  created_at: Date;
}

export interface ContactWithProfile {
  id: string;
  contact_id: string;
  name: string;
  phone: string;
  avatar_url: string;
  bio: string;
  created_at: Date;
}

function rowToProfile(row: any): ContactWithProfile {
  return {
    id: row.id,
    contact_id: row.contact_id,
    name: row.contact_name || row.name,
    phone: row.phone,
    avatar_url: row.avatar_url || '',
    bio: row.bio || '',
    created_at: row.created_at,
  };
}

export async function syncContacts(userId: string, phones: string[]): Promise<ContactWithProfile[]> {
  if (phones.length === 0) return [];

  const existingUsers = await pgPool.query(
    `SELECT id, phone, name, avatar_url, bio FROM users WHERE phone = ANY($1::varchar[])`,
    [phones],
  );

  if (existingUsers.rows.length === 0) return [];

  const values: string[] = [];
  const params: any[] = [userId];
  let idx = 2;

  for (const row of existingUsers.rows) {
    if (row.id === userId) continue;
    values.push(`($1, $${idx}, $${idx + 1})`);
    params.push(row.id, row.name || row.phone);
    idx += 2;
  }

  if (values.length === 0) return [];

  await pgPool.query(
    `INSERT INTO contacts (user_id, contact_id, name, phone)
     VALUES ${values.join(', ')}
     ON CONFLICT (user_id, contact_id) DO NOTHING`,
    params,
  );

  logger.info({ userId, contactsFound: existingUsers.rows.length }, 'Contactos sincronizados');

  return listContacts(userId);
}

export async function listContacts(userId: string): Promise<ContactWithProfile[]> {
  const result = await pgPool.query(
    `SELECT c.id, c.contact_id, c.name, c.phone,
            u.name AS contact_name, u.avatar_url, u.bio, c.created_at
     FROM contacts c
     JOIN users u ON u.id = c.contact_id
     WHERE c.user_id = $1
     ORDER BY c.name ASC`,
    [userId],
  );

  return result.rows.map(rowToProfile);
}

export async function removeContact(contactId: string, userId: string): Promise<void> {
  const result = await pgPool.query(
    'DELETE FROM contacts WHERE id = $1 AND user_id = $2 RETURNING id',
    [contactId, userId],
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'Contacto no encontrado');
  }

  logger.info({ contactId, userId }, 'Contacto eliminado');
}
