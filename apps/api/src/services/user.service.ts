import { randomUUID } from 'crypto';
import { pgPool } from '../config/postgres';
import { redis } from '../config/redis';
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

const USER_CACHE_TTL = 3600;

function toPublic(user: User): PublicProfile {
  return {
    id: user.id,
    name: user.name,
    bio: user.bio,
    avatar_url: user.avatar_url,
  };
}

async function cacheUser(user: User): Promise<void> {
  await redis.setex(`user:${user.id}`, USER_CACHE_TTL, JSON.stringify(user));
}

async function invalidateUserCache(id: string): Promise<void> {
  await redis.del(`user:${id}`);
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
  const cached = await redis.get(`user:${id}`);
  if (cached) {
    return JSON.parse(cached) as User;
  }

  const result = await pgPool.query<User>(
    'SELECT * FROM users WHERE id = $1',
    [id],
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'Usuario no encontrado');
  }

  await cacheUser(result.rows[0]);
  return result.rows[0];
}

export async function searchByPhone(phone: string): Promise<any[]> {
  const result = await pgPool.query(
    'SELECT id, phone, name, bio, avatar_url FROM users WHERE phone LIKE $1 LIMIT 20',
    [`%${phone}%`],
  );
  return result.rows;
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

  await invalidateUserCache(id);
  await cacheUser(result.rows[0]);

  logger.info({ userId: id, updates: Object.keys(data) }, 'Perfil actualizado');
  return result.rows[0];
}
