import request from 'supertest';
import { createTestApp, authHeader, setupAuthMocks } from './helpers';
import { mockPgPool } from './setup';

const app = createTestApp();

describe('Users Routes', () => {
  const testUser = { phone: '+51999000001', userId: 'user-123', name: 'Alice' };

  beforeEach(() => {
    setupAuthMocks(testUser);
  });

  describe('GET /users/me', () => {
    it('debe retornar perfil del usuario autenticado', async () => {
      const res = await request(app)
        .get('/users/me')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('phone');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('avatar_url');
    });

    it('debe rechazar sin token de autenticacion', async () => {
      const res = await request(app).get('/users/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token requerido');
    });

    it('debe rechazar con token invalido', async () => {
      const res = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token invalido o expirado');
    });
  });

  describe('PATCH /users/me', () => {
    it('debe actualizar nombre exitosamente', async () => {
      mockPgPool.query.mockImplementation((sql: string, params?: any[]) => {
        const sqlLower = sql.toLowerCase();
        if (sqlLower.includes('update users')) {
          return Promise.resolve({
            rows: [{ id: testUser.userId, phone: testUser.phone, name: params?.[0] || 'Alice', bio: '', avatar_url: '' }],
          });
        }
        if (sqlLower.includes('from users') && sqlLower.includes('where phone')) {
          return Promise.resolve({
            rows: [{ id: testUser.userId, phone: testUser.phone, name: testUser.name, bio: '', avatar_url: '', created_at: new Date(), updated_at: new Date() }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .patch('/users/me')
        .set(authHeader())
        .send({ name: 'Alice Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Alice Updated');
    });

    it('debe actualizar bio exitosamente', async () => {
      mockPgPool.query.mockImplementation((sql: string, params?: any[]) => {
        const sqlLower = sql.toLowerCase();
        if (sqlLower.includes('update users')) {
          const hasBio = sqlLower.includes('bio');
          const hasName = sqlLower.includes('name');
          const bioIdx = hasName ? 1 : 0;
          return Promise.resolve({
            rows: [{ id: testUser.userId, phone: testUser.phone, name: 'Alice', bio: hasBio ? params?.[bioIdx] : 'New bio', avatar_url: '' }],
          });
        }
        if (sqlLower.includes('from users') && sqlLower.includes('where phone') && !sqlLower.includes('like')) {
          return Promise.resolve({
            rows: [{ id: testUser.userId, phone: testUser.phone, name: testUser.name, bio: '', avatar_url: '', created_at: new Date(), updated_at: new Date() }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .patch('/users/me')
        .set(authHeader())
        .send({ bio: 'New bio' });

      expect(res.status).toBe(200);
      expect(res.body.bio).toBe('New bio');
    });
  });

  describe('GET /users/search', () => {
    it('debe buscar usuarios por telefono', async () => {
      mockPgPool.query.mockImplementation((sql: string) => {
        const sqlLower = sql.toLowerCase();
        if (sqlLower.includes('from users') && sqlLower.includes('like')) {
          return Promise.resolve({
            rows: [
              { id: 'user-2', phone: '+51999000002', name: 'Bob', bio: '', avatar_url: '' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get('/users/search?phone=+51999')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.users).toBeDefined();
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it('debe rechazar busqueda con menos de 3 caracteres', async () => {
      const res = await request(app)
        .get('/users/search?phone=12')
        .set(authHeader());

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('al menos 3 caracteres');
    });

    it('debe rechazar sin parametro phone', async () => {
      const res = await request(app)
        .get('/users/search')
        .set(authHeader());

      expect(res.status).toBe(400);
    });
  });

  describe('GET /users/:id', () => {
    it('debe retornar perfil publico por ID', async () => {
      mockPgPool.query.mockImplementation((sql: string) => {
        const sqlLower = sql.toLowerCase();
        if (sqlLower.includes('from users') && sqlLower.includes('where id')) {
          return Promise.resolve({
            rows: [{ id: 'user-999', phone: '+51999000999', name: 'Charlie', bio: 'Hello', avatar_url: '/uploads/avatar.jpg', created_at: new Date(), updated_at: new Date() }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app).get('/users/user-999');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('user-999');
      expect(res.body.name).toBe('Charlie');
      expect(res.body).not.toHaveProperty('phone');
    });

    it('debe retornar 404 si usuario no existe', async () => {
      mockPgPool.query.mockImplementation((sql: string) => {
        const sqlLower = sql.toLowerCase();
        if (sqlLower.includes('from users') && sqlLower.includes('where id')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app).get('/users/nonexistent-id');

      expect(res.status).toBe(404);
    });
  });
});
