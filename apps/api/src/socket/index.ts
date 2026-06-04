import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { redis } from '../config/redis';
import { logger } from '../lib/logger';
import { verifySocketToken, SocketAuth } from './auth';
import { registerMessageHandlers } from './messages';

const ONLINE_TTL = 35;
const HEARTBEAT_TOLERANCE = 10;

function redisKey(prefix: string, id: string): string {
  return `io:${prefix}:${id}`;
}

let ioInstance: SocketServer | null = null;

export function getIO(): SocketServer {
  if (!ioInstance) throw new Error('Socket.IO no inicializado');
  return ioInstance;
}

export async function isUserOnline(userId: string): Promise<boolean> {
  const exists = await redis.get(redisKey('online', userId));
  return exists !== null;
}

export async function getUserSockets(userId: string): Promise<string[]> {
  return redis.smembers(redisKey('user', userId));
}

export function initSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Token requerido'));

    try {
      const auth = verifySocketToken(token);
      (socket as any).auth = auth;
      next();
    } catch (err) {
      next(err as Error);
    }
  });

  ioInstance = io;

  io.on('connection', async (socket: Socket) => {
    const auth = (socket as any).auth as SocketAuth;
    const { userId, phone } = auth;

    logger.info({ socketId: socket.id, userId }, 'Socket conectado');

    await redis.set(redisKey('socket', socket.id), userId);
    await redis.sadd(redisKey('user', userId), socket.id);
    await redis.setex(redisKey('online', userId), ONLINE_TTL, '1');

    registerMessageHandlers(socket);

    socket.on('typing:start', async (conversationId: string) => {
      const key = redisKey('typing', `${conversationId}:${userId}`);
      await redis.setex(key, 5, '1');
      socket.to(conversationId).emit('typing:start', { conversationId, userId });
    });

    socket.on('typing:stop', async (conversationId: string) => {
      const key = redisKey('typing', `${conversationId}:${userId}`);
      await redis.del(key);
      socket.to(conversationId).emit('typing:stop', { conversationId, userId });
    });

    socket.on('heartbeat', async () => {
      await redis.setex(redisKey('online', userId), ONLINE_TTL, '1');
    });

    socket.on('join_room', async (roomId: string) => {
      socket.join(roomId);
      logger.info({ socketId: socket.id, userId, roomId }, 'Socket unido a sala');
    });

    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
      logger.info({ socketId: socket.id, userId, roomId }, 'Socket salio de sala');
    });

    socket.on('disconnect', async (reason) => {
      logger.info({ socketId: socket.id, userId, reason }, 'Socket desconectado');

      await redis.del(redisKey('socket', socket.id));
      await redis.srem(redisKey('user', userId), socket.id);

      const remaining = await redis.scard(redisKey('user', userId));
      if (remaining === 0) {
        await redis.del(redisKey('online', userId));
      }
    });
  });

  return io;
}
