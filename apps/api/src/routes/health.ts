import { Router, Request, Response } from 'express';
import { pgPool } from '../config/postgres';
import { redis } from '../config/redis';
import mongoose from 'mongoose';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Verifica el estado de las bases de datos
 *     responses:
 *       200:
 *         description: Todos los servicios operativos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 services:
 *                   type: object
 *                   properties:
 *                     postgres: { type: string, example: ok }
 *                     mongodb: { type: string, example: ok }
 *                     redis: { type: string, example: ok }
 *       503:
 *         description: Servicio degradado
 */
router.get('/', async (_req: Request, res: Response) => {
  const start = Date.now();

  let pgStatus = 'ok';
  try {
    const client = await pgPool.connect();
    await client.query('SELECT 1');
    client.release();
  } catch {
    pgStatus = 'error';
  }

  const mongoStatus =
    mongoose.connection.readyState === 1 ? 'ok' : 'error';

  let redisStatus = 'ok';
  try {
    await redis.ping();
  } catch {
    redisStatus = 'error';
  }

  const allOk = [pgStatus, mongoStatus, redisStatus].every((s) => s === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: `${Date.now() - start}ms`,
    services: {
      postgres: pgStatus,
      mongodb: mongoStatus,
      redis: redisStatus,
    },
  });
});

export default router;
