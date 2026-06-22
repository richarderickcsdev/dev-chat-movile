import request from 'supertest';
import { createTestApp, setupAuthMocks, generateTestToken } from './helpers';
import { mockRedis } from './setup';

const app = createTestApp();

describe('Auth Routes', () => {
  describe('POST /auth/send-otp', () => {
    it('debe enviar OTP exitosamente con telefono valido', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({ phone: '+51999000001' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Codigo enviado');
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'otp:+51999000001',
        300,
        expect.any(String),
      );
    });

    it('debe rechazar telefono invalido', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({ phone: 'abc' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Datos invalidos');
    });

    it('debe rechazar cuando falta el campo phone', async () => {
      const res = await request(app)
        .post('/auth/send-otp')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Datos invalidos');
    });
  });

  describe('POST /auth/verify-otp', () => {
    beforeEach(() => {
      setupAuthMocks({ phone: '+51999000001', userId: 'user-123' });
    });

    it('debe verificar OTP y retornar tokens', async () => {
      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: '+51999000001', code: '123456' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('debe rechazar codigo incorrecto', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'otp:+51999000001') return Promise.resolve('999999');
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: '+51999000001', code: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Codigo incorrecto');
    });

    it('debe rechazar cuando no hay OTP solicitado', async () => {
      mockRedis.get.mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: '+51999000001', code: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Codigo no solicitado o expirado');
    });

    it('debe rechazar formato de codigo invalido', async () => {
      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: '+51999000001', code: '12' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Datos invalidos');
    });
  });

  describe('POST /auth/refresh', () => {
    beforeEach(() => {
      const { userId, phone } = setupAuthMocks({ phone: '+51999000001', userId: 'user-123' });
      mockRedis.get.mockImplementation((key: string) => {
        if (key.startsWith('refresh:')) return Promise.resolve(userId);
        if (key.startsWith('phone:')) return Promise.resolve(phone);
        return Promise.resolve(null);
      });
    });

    it('debe refrescar tokens exitosamente', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: generateTestToken() });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('debe rechazar refresh token invalido', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key.startsWith('refresh:')) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Refresh token invalido o expirado');
    });

    it('debe rechazar falta de refreshToken', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Datos invalidos');
    });
  });
});
