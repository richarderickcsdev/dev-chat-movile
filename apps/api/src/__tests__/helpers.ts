import './setup';

import express from 'express';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';

import healthRouter from '../routes/health';
import authRouter from '../routes/auth';
import usersRouter from '../routes/users';
import contactsRouter from '../routes/contacts';
import conversationsRouter from '../routes/conversations';
import groupsRouter from '../routes/groups';
import { errorHandler } from '../middlewares/errorHandler';

export function createTestApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/health', healthRouter);
  app.use('/uploads', express.static(path.resolve('./uploads')));
  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/contacts', contactsRouter);
  app.use('/conversations', conversationsRouter);
  app.use('/groups', groupsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  app.use(errorHandler);

  return app;
}

export function generateTestToken(userId = 'user-123', phone = '+51999000001'): string {
  return jwt.sign({ userId, phone }, 'test-secret', { expiresIn: '7d' } as any) as string;
}

export function authHeader(token?: string): Record<string, string> {
  return { Authorization: `Bearer ${token || generateTestToken()}` };
}

export function setupAuthMocks(opts?: { phone?: string; userId?: string; userName?: string }) {
  const phone = opts?.phone || '+51999000001';
  const userId = opts?.userId || 'test-user-id';
  const name = opts?.userName || 'Test User';

  const { mockPgPool } = require('./setup');
  const { mockRedis } = require('./setup');

  mockPgPool.query.mockImplementation((sql: string, params?: any[]) => {
    const sqlLower = sql.toLowerCase();

    if (sqlLower.includes('from users') && sqlLower.includes('where phone') && !sqlLower.includes('like') && !sqlLower.includes('any($1')) {
      return Promise.resolve({
        rows: [{ id: userId, phone, name, bio: '', avatar_url: '', created_at: new Date(), updated_at: new Date() }],
      });
    }

    if (sqlLower.includes('from users') && sqlLower.includes('where id') && !sqlLower.includes('join')) {
      return Promise.resolve({
        rows: [{ id: userId, phone, name, bio: 'Bio test', avatar_url: '/uploads/avatar.jpg', created_at: new Date(), updated_at: new Date() }],
      });
    }

    if (sqlLower.includes('insert into users')) {
      return Promise.resolve({
        rows: [{ id: userId, phone, name: '', bio: '', avatar_url: '', created_at: new Date(), updated_at: new Date() }],
      });
    }

    if (sqlLower.includes('select now()')) {
      return Promise.resolve({ rows: [{ now: new Date() }] });
    }

    return Promise.resolve({ rows: [] });
  });

  mockRedis.get.mockImplementation((key: string) => {
    if (key.startsWith('otp:')) return Promise.resolve('123456');
    if (key.startsWith('refresh:')) return Promise.resolve(userId);
    if (key.startsWith('phone:')) return Promise.resolve(phone);
    return Promise.resolve(null);
  });

  mockRedis.setex.mockResolvedValue('OK');
  mockRedis.del.mockResolvedValue(1);

  return { phone, userId, token: generateTestToken(userId, phone) };
}
