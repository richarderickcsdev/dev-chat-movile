import request from 'supertest';
import { createTestApp, authHeader, setupAuthMocks } from './helpers';
import { mockGroup } from './setup';

const app = createTestApp();

describe('Groups Routes', () => {
  const testUser = { phone: '+51999000001', userId: 'user-123', name: 'Alice' };

  function makeGroupDoc(overrides?: any) {
    const base = {
      _id: 'group-123',
      name: 'Amigos',
      members: ['user-123', 'user-456'],
      createdBy: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
      toObject: function (this: any) {
        return {
          _id: this._id, name: this.name,
          members: [...this.members], createdBy: this.createdBy,
          createdAt: this.createdAt, updatedAt: this.updatedAt,
        };
      },
      ...overrides,
    };
    base.toObject = base.toObject.bind(base);
    return base;
  }

  function mockGroupFindById(doc: any) {
    mockGroup.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...doc }),
      ...doc,
    });
  }

  beforeEach(() => {
    setupAuthMocks(testUser);

    const defaultDoc = makeGroupDoc();
    mockGroup.create.mockResolvedValue(defaultDoc);
    mockGroup.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ ...defaultDoc }]),
    });
    mockGroupFindById(defaultDoc);
  });

  describe('POST /groups', () => {
    it('debe crear un grupo exitosamente', async () => {
      const res = await request(app)
        .post('/groups')
        .set(authHeader())
        .send({ name: 'Amigos', memberIds: ['user-456'] });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Amigos');
      expect(res.body.members).toContain('user-123');
      expect(res.body.members).toContain('user-456');
      expect(res.body.createdBy).toBe('user-123');
    });

    it('debe rechazar nombre vacio', async () => {
      const res = await request(app)
        .post('/groups')
        .set(authHeader())
        .send({ name: '', memberIds: ['user-456'] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Datos invalidos');
    });

    it('debe rechazar sin memberIds', async () => {
      const res = await request(app)
        .post('/groups')
        .set(authHeader())
        .send({ name: 'Amigos' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /groups', () => {
    it('debe listar grupos del usuario', async () => {
      const res = await request(app)
        .get('/groups')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.groups).toBeDefined();
      expect(Array.isArray(res.body.groups)).toBe(true);
    });
  });

  describe('GET /groups/:id', () => {
    it('debe obtener detalle de un grupo', async () => {
      const res = await request(app)
        .get('/groups/group-123')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Amigos');
      expect(res.body.members).toContain('user-123');
    });

    it('debe retornar 404 si el grupo no existe', async () => {
      mockGroup.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .get('/groups/nonexistent')
        .set(authHeader());

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Grupo no encontrado');
    });
  });

  describe('POST /groups/:id/members', () => {
    it('debe agregar miembros al grupo', async () => {
      const res = await request(app)
        .post('/groups/group-123/members')
        .set(authHeader())
        .send({ memberIds: ['user-789'] });

      expect(res.status).toBe(200);
    });

    it('debe rechazar si el usuario no es miembro', async () => {
      const outsidersDoc = makeGroupDoc({ members: ['user-999'], createdBy: 'user-999' });
      mockGroupFindById(outsidersDoc);

      const res = await request(app)
        .post('/groups/group-123/members')
        .set(authHeader())
        .send({ memberIds: ['user-789'] });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('No eres miembro del grupo');
    });
  });

  describe('DELETE /groups/:id/members/:userId', () => {
    it('debe eliminar un miembro del grupo', async () => {
      const res = await request(app)
        .delete('/groups/group-123/members/user-456')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Miembro eliminado');
    });

    it('debe rechazar si no es el creador', async () => {
      const notOwnerDoc = makeGroupDoc({ members: ['user-456', 'user-123'], createdBy: 'user-456' });
      mockGroupFindById(notOwnerDoc);

      const res = await request(app)
        .delete('/groups/group-123/members/user-123')
        .set(authHeader());

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Solo el creador puede eliminar miembros');
    });
  });
});
