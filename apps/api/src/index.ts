import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';

import { env } from './config/env';
import { connectPostgres } from './config/postgres';
import { connectMongo } from './config/mongo';
import { connectRedis } from './config/redis';
import { connectKafka } from './config/kafka';
import { initSchema } from './config/schema';
import { initSocket } from './socket';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import contactsRouter from './routes/contacts';
import conversationsRouter from './routes/conversations';
import groupsRouter from './routes/groups';
import { swaggerSpec, swaggerUi } from './config/swagger';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './lib/logger';

async function bootstrap() {
  logger.info('Iniciando dev-chat-api');

  await Promise.all([
    connectPostgres(),
    connectMongo(),
    connectRedis(),
    connectKafka().catch((err: Error) =>
      logger.warn({ err }, 'Kafka no disponible (opcional en dev)'),
    ),
  ]);

  await initSchema();

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/health', healthRouter);
  app.use('/uploads', express.static(path.resolve(env.MEDIA_LOCAL_PATH)));
  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/contacts', contactsRouter);
  app.use('/conversations', conversationsRouter);
  app.use('/groups', groupsRouter);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  app.use(errorHandler);

  const httpServer = http.createServer(app);
  const io = initSocket(httpServer);

  app.set('io', io);

  httpServer.listen(env.PORT, () => {
    logger.info(`Servidor corriendo en http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Error fatal al iniciar');
  process.exit(1);
});
