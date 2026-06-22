import { Socket } from 'socket.io';
import { z } from 'zod';
import { createMessage, getMessages, markAsDelivered, markAsRead } from '../services/message.service';
import { updateLastMessage, getConversationById } from '../services/conversation.service';
import { getIO } from './index';
import { logger } from '../lib/logger';
import { SocketAuth } from './auth';

const sendMessageSchema = z.object({
  tempId: z.string().min(1).max(100),
  conversationId: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
});

const deliveredSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1).max(100),
  conversationId: z.string().min(1),
});

const readSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1).max(100),
  conversationId: z.string().min(1),
});

export function registerMessageHandlers(socket: Socket): void {
  const auth = (socket as any).auth as SocketAuth;
  const io = getIO();

  socket.on('message:send', async (data: unknown) => {
    try {
      const input = sendMessageSchema.parse(data);
      const message = await createMessage(auth.userId, input);

      updateLastMessage(input.conversationId, {
        content: input.content,
        senderId: auth.userId,
        createdAt: message.createdAt,
      }).catch(() => {});

      socket.emit('message:ack', {
        tempId: input.tempId,
        messageId: message._id.toString(),
        status: 'sent',
      });

      const msgEvent = {
        _id: message._id.toString(),
        conversationId: input.conversationId,
        senderId: auth.userId,
        content: input.content,
        status: 'sent',
        createdAt: message.createdAt.toISOString(),
      };

      io.to(input.conversationId).emit('message:new', msgEvent);

      getConversationById(input.conversationId).then((conv) => {
        if (conv) {
          conv.participants.forEach((pid) => {
            if (pid !== auth.userId) {
              io.to(pid).emit('message:new', msgEvent);
            }
          });
        }
      }).catch(() => {});
    } catch (err) {
      if (err instanceof z.ZodError) {
        socket.emit('message:error', {
          error: 'Datos invalidos: ' + err.issues.map(e => e.message).join(', '),
        });
      } else {
        logger.error({ err }, 'Error al enviar mensaje');
        socket.emit('message:error', { error: 'Error interno al enviar mensaje' });
      }
    }
  });

  socket.on('messages:delivered', async (data: unknown) => {
    try {
      const { messageIds, conversationId } = deliveredSchema.parse(data);
      await markAsDelivered(messageIds);

      io.to(conversationId).emit('messages:status', {
        messageIds,
        conversationId,
        status: 'delivered',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        socket.emit('message:error', { error: 'Datos invalidos' });
      }
    }
  });

  socket.on('messages:read', async (data: unknown) => {
    try {
      const { messageIds, conversationId } = readSchema.parse(data);
      const updatedIds = await markAsRead(messageIds, auth.userId);

      if (updatedIds.length > 0) {
        io.to(conversationId).emit('messages:status', {
          messageIds: updatedIds,
          conversationId,
          status: 'read',
          readBy: auth.userId,
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        socket.emit('message:error', { error: 'Datos invalidos' });
      }
    }
  });

  socket.on('messages:list', async (data: unknown) => {
    try {
      const schema = z.object({
        conversationId: z.string().min(1),
        limit: z.number().int().min(1).max(100).optional(),
        before: z.string().optional(),
      });
      const { conversationId, limit, before } = schema.parse(data);
      const messages = await getMessages(conversationId, { limit, before });
      socket.emit('messages:list', { conversationId, messages });
    } catch (err) {
      logger.error({ err }, 'Error al listar mensajes');
      socket.emit('message:error', { error: 'Error al obtener mensajes' });
    }
  });
}
