import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { logger } from '../lib/logger';

export function initSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id }, 'Socket conectado');

    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
      logger.info({ socketId: socket.id, roomId }, 'Socket unido a sala');
    });

    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
      logger.info({ socketId: socket.id, roomId }, 'Socket salió de sala');
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Socket desconectado');
    });
  });

  return io;
}
