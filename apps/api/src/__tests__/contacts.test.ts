import request from 'supertest';
import { createTestApp, authHeader, setupAuthMocks } from './helpers';
import { mockPgPool } from './setup';

const app = createTestApp();

describe('Contacts Routes', () => {
  const testUser = { phone: '+51999000001', userId: 'user-123', name: 'Alice' };

  beforeEach(() => {
    setupAuthMocks(testUser);
  });

  describe('POST /contacts/sync', () => {
    it('debe sincronizar contactos exitosamente', async () => {
      let callCount = 0;
      mockPgPool.query.mockImplementation((sql: string, params?: any[]) => {
        const sqlLower = sql.toLowerCase();
        callCount++;

        if (sqlLower.includes('from users') && sqlLower.includes('where phone') && !sqlLower.includes('any($1')) {
          return Promise.resolve({ rows: [{ id: testUser.userId }] });
        }

        if (sqlLower.includes('from users') && sqlLower.includes('any($1')) {
          return Promise.resolve({
            rows: [
              { id: 'contact-1', phone: '+51999000002', name: 'Bob', avatar_url: '', bio: '' },
            ],
          });
        }

        if (sqlLower.includes('insert into contacts')) {
          return Promise.resolve({ rows: [] });
        }

        if (sqlLower.includes('from contacts')) {
          return Promise.resolve({
            rows: [
              { id: 'c-1', contact_id: 'contact-1', name: 'Bob', phone: '+51999000002', contact_name: 'Bob', avatar_url: '', bio: '', created_at: new Date() },
            ],
          });
        }

        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/contacts/sync')
        .set(authHeader())
        .send({ phones: ['+51999000002'] });

      expect(res.status).toBe(200);
      expect(res.body.contacts).toBeDefined();
      expect(Array.isArray(res.body.contacts)).toBe(true);
    });

    it('debe rechazar lista de telefonos vacia', async () => {
      const res = await request(app)
        .post('/contacts/sync')
        .set(authHeader())
        .send({ phones: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Datos invalidos');
    });

    it('debe rechazar sin phones', async () => {
      const res = await request(app)
        .post('/contacts/sync')
        .set(authHeader())
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /contacts', () => {
    it('debe listar contactos del usuario', async () => {
      mockPgPool.query.mockImplementation((sql: string) => {
        const sqlLower = sql.toLowerCase();

        if (sqlLower.includes('from users') && sqlLower.includes('where phone') && !sqlLower.includes('join')) {
          return Promise.resolve({ rows: [{ id: testUser.userId }] });
        }

        if (sqlLower.includes('from contacts')) {
          return Promise.resolve({
            rows: [
              { id: 'c-1', contact_id: 'contact-1', name: 'Bob', phone: '+51999000002', contact_name: 'Bob', avatar_url: '', bio: '', created_at: new Date() },
              { id: 'c-2', contact_id: 'contact-2', name: 'Charlie', phone: '+51999000003', contact_name: 'Charlie', avatar_url: '', bio: '', created_at: new Date() },
            ],
          });
        }

        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get('/contacts')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.contacts).toBeDefined();
      expect(res.body.contacts.length).toBe(2);
    });

    it('debe rechazar sin autenticacion', async () => {
      const res = await request(app).get('/contacts');

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /contacts/:id', () => {
    it('debe eliminar un contacto', async () => {
      mockPgPool.query.mockImplementation((sql: string) => {
        const sqlLower = sql.toLowerCase();

        if (sqlLower.includes('from users') && sqlLower.includes('where phone') && !sqlLower.includes('join')) {
          return Promise.resolve({ rows: [{ id: testUser.userId }] });
        }

        if (sqlLower.includes('delete from contacts')) {
          return Promise.resolve({ rows: [{ id: 'c-1' }] });
        }

        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .delete('/contacts/c-1')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Contacto eliminado');
    });

    it('debe retornar 404 si contacto no existe', async () => {
      mockPgPool.query.mockImplementation((sql: string) => {
        const sqlLower = sql.toLowerCase();

        if (sqlLower.includes('from users') && sqlLower.includes('where phone') && !sqlLower.includes('join')) {
          return Promise.resolve({ rows: [{ id: testUser.userId }] });
        }

        if (sqlLower.includes('delete from contacts')) {
          return Promise.resolve({ rows: [] });
        }

        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .delete('/contacts/nonexistent')
        .set(authHeader());

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Contacto no encontrado');
    });
  });

  describe('PATCH /contacts/:id', () => {
    it('debe actualizar nombre de contacto', async () => {
      mockPgPool.query.mockImplementation((sql: string) => {
        const sqlLower = sql.toLowerCase();

        if (sqlLower.includes('from users') && sqlLower.includes('where phone') && !sqlLower.includes('join')) {
          return Promise.resolve({ rows: [{ id: testUser.userId }] });
        }

        if (sqlLower.includes('update contacts')) {
          return Promise.resolve({ rows: [{ id: 'c-1' }] });
        }

        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .patch('/contacts/c-1')
        .set(authHeader())
        .send({ name: 'Bobby Updated' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Nombre actualizado');
    });

    it('debe rechazar nombre vacio', async () => {
      const res = await request(app)
        .patch('/contacts/c-1')
        .set(authHeader())
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Datos invalidos');
    });
  });
});
