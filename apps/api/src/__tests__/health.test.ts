import request from 'supertest';
import { createTestApp } from './helpers';
import { mockPgPool, mockRedis } from './setup';

const app = createTestApp();

describe('GET /health', () => {
  it('debe retornar 200 cuando todas las DBs responden ok', async () => {
    mockPgPool.connect.mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      release: jest.fn(),
    });

    mockRedis.ping.mockResolvedValue('PONG');

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.services.postgres).toBe('ok');
    expect(res.body.services.mongodb).toBe('ok');
    expect(res.body.services.redis).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('responseTime');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('debe retornar 503 cuando Postgres falla', async () => {
    mockPgPool.connect.mockRejectedValue(new Error('Connection refused'));

    mockRedis.ping.mockResolvedValue('PONG');

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.services.postgres).toBe('error');
    expect(res.body.services.redis).toBe('ok');
  });

  it('debe retornar 503 cuando Redis falla', async () => {
    mockPgPool.connect.mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      release: jest.fn(),
    });

    mockRedis.ping.mockRejectedValue(new Error('Connection refused'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.services.redis).toBe('error');
    expect(res.body.services.postgres).toBe('ok');
  });
});
