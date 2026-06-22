import request from 'supertest';
import { createTestApp, authHeader, setupAuthMocks } from './helpers';
import { mockPgPool, mockConversation, mockMessage, mockRedis } from './setup';

const app = createTestApp();

describe('Conversations Routes', () => {
  const testUser = { phone: '+51999000001', userId: 'user-123', name: 'Alice' };

  beforeEach(() => {
    setupAuthMocks(testUser);

    mockConversation.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    mockConversation.findOne.mockResolvedValue(null);

    mockConversation.create.mockResolvedValue({
      _id: 'conv-123',
      participants: ['user-123', 'user-456'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockMessage.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    mockMessage.aggregate.mockResolvedValue([]);
    mockMessage.findOne.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });

    mockRedis.get.mockResolvedValue(null);
  });

  describe('POST /conversations', () => {
    it('debe crear una conversacion nueva', async () => {
      const res = await request(app)
        .post('/conversations')
        .set(authHeader())
        .send({ participantId: 'user-456' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body._id).toBe('conv-123');
    });

    it('debe retornar conversacion existente si ya existe', async () => {
      mockConversation.findOne.mockResolvedValue({
        _id: 'conv-existing',
        participants: ['user-123', 'user-456'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/conversations')
        .set(authHeader())
        .send({ participantId: 'user-456' });

      expect(res.status).toBe(201);
      expect(res.body._id).toBe('conv-existing');
    });

    it('debe rechazar sin participantId', async () => {
      const res = await request(app)
        .post('/conversations')
        .set(authHeader())
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Datos invalidos');
    });
  });

  describe('GET /conversations', () => {
    it('debe listar conversaciones del usuario', async () => {
      mockConversation.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'conv-123',
            participants: ['user-123', 'user-456'],
            lastMessage: { content: 'Hola', senderId: 'user-456', createdAt: new Date() },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      });

      mockPgPool.query.mockImplementation((sql: string) => {
        const sqlLower = sql.toLowerCase();
        if (sqlLower.includes('from users') && sqlLower.includes('where id') && sqlLower.includes('$1')) {
          return Promise.resolve({
            rows: [{ id: 'user-456', phone: '+51999000002', name: 'Bob', bio: '', avatar_url: '', created_at: new Date(), updated_at: new Date() }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get('/conversations')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.conversations).toBeDefined();
      expect(Array.isArray(res.body.conversations)).toBe(true);
    });
  });

  describe('GET /conversations/:id/messages', () => {
    it('debe obtener mensajes de una conversacion', async () => {
      mockConversation.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'conv-123',
          participants: ['user-123', 'user-456'],
        }),
      });

      mockMessage.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: 'msg-1', conversationId: 'conv-123', senderId: 'user-123', content: 'Hola', tempId: 't1', status: 'sent', type: 'text', createdAt: new Date(), updatedAt: new Date() },
        ]),
      });

      const res = await request(app)
        .get('/conversations/conv-123/messages')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.messages).toBeDefined();
      expect(res.body.messages.length).toBe(1);
    });

    it('debe retornar 404 si la conversacion no existe', async () => {
      mockConversation.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .get('/conversations/nonexistent/messages')
        .set(authHeader());

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Conversacion no encontrada');
    });
  });

  describe('DELETE /conversations/:id', () => {
    it('debe eliminar una conversacion', async () => {
      const res = await request(app)
        .delete('/conversations/conv-123')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Conversacion eliminada');
    });
  });

  describe('DELETE /conversations/:conversationId/messages/:messageId', () => {
    it('debe eliminar un mensaje propio', async () => {
      mockMessage.findOneAndDelete.mockResolvedValue({
        _id: 'msg-1',
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Hola',
        status: 'sent',
      });

      mockConversation.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'conv-123',
          participants: ['user-123', 'user-456'],
          lastMessage: { content: 'Hola', senderId: 'user-123', createdAt: new Date() },
        }),
      });

      const res = await request(app)
        .delete('/conversations/conv-123/messages/msg-1')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Mensaje eliminado');
    });

    it('debe retornar 404 si mensaje no existe', async () => {
      mockMessage.findOneAndDelete.mockResolvedValue(null);

      const res = await request(app)
        .delete('/conversations/conv-123/messages/msg-999')
        .set(authHeader());

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Mensaje no encontrado o no autorizado');
    });
  });

  describe('PATCH /conversations/:conversationId/messages/:messageId', () => {
    it('debe editar un mensaje propio', async () => {
      mockMessage.findOneAndUpdate.mockResolvedValue({
        _id: 'msg-1',
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Editado',
        status: 'sent',
        createdAt: new Date(),
      });

      mockConversation.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'conv-123',
          participants: ['user-123', 'user-456'],
          lastMessage: { content: 'Original', senderId: 'user-123', createdAt: new Date() },
        }),
      });

      const res = await request(app)
        .patch('/conversations/conv-123/messages/msg-1')
        .set(authHeader())
        .send({ content: 'Editado' });

      expect(res.status).toBe(200);
    });

    it('debe retornar 404 si no es el autor', async () => {
      mockMessage.findOneAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .patch('/conversations/conv-123/messages/msg-1')
        .set(authHeader())
        .send({ content: 'Editado' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Mensaje no encontrado o no autorizado');
    });
  });
});
