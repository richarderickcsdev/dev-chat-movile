import { randomUUID } from 'crypto';
import { pgPool } from '../config/postgres';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';

export interface User {
  id: string;
  phone: string;
  name: string;
  bio: string;
  avatar_url: string;
  created_at: Date;
  updated_at: Date;
}

export interface PublicProfile {
  id: string;
  name: string;
  bio: string;
  avatar_url: string;
}

function toPublic(user: User): PublicProfile {
  return {
    id: user.id,
    name: user.name,
    bio: user.bio,
    avatar_url: user.avatar_url,
  };
}

export async function findOrCreateByPhone(phone: string): Promise<User> {
  const existing = await pgPool.query<User>(
    'SELECT * FROM users WHERE phone = $1',
    [phone],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const id = randomUUID();
  const created = await pgPool.query<User>(
    `INSERT INTO users (id, phone) VALUES ($1, $2)
     RETURNING *`,
    [id, phone],
  );

  logger.info({ userId: id, phone }, 'Usuario creado en PostgreSQL');
  return created.rows[0];
}

export async function findById(id: string): Promise<User> {
  const result = await pgPool.query<User>(
    'SELECT * FROM users WHERE id = $1',
    [id],
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'Usuario no encontrado');
  }

  return result.rows[0];
}

export async function findByIdPublic(id: string): Promise<PublicProfile> {
  const user = await findById(id);
  return toPublic(user);
}

export async function updateProfile(
  id: string,
  data: { name?: string; bio?: string; avatar_url?: string },
): Promise<User> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(data.name);
  }
  if (data.bio !== undefined) {
    fields.push(`bio = $${idx++}`);
    values.push(data.bio);
  }
  if (data.avatar_url !== undefined) {
    fields.push(`avatar_url = $${idx++}`);
    values.push(data.avatar_url);
  }

  if (fields.length === 0) {
    return findById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pgPool.query<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING *`,
    values,
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'Usuario no encontrado');
  }

  logger.info({ userId: id, updates: Object.keys(data) }, 'Perfil actualizado');
  return result.rows[0];
}
