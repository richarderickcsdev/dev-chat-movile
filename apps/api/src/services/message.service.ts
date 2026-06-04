import { Message, IMessage } from '../models/message';
import { getProducer } from '../config/kafka';
import { getIO } from '../socket';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export interface SendMessageInput {
  conversationId: string;
  content: string;
  tempId: string;
}

export async function deleteMessage(messageId: string, userId: string): Promise<IMessage | null> {
  const message = await Message.findOneAndDelete({
    _id: messageId,
    senderId: userId,
  });
  if (!message) return null;

  logger.info({ messageId, userId }, 'Mensaje eliminado');
  return message;
}

export async function createMessage(senderId: string, input: SendMessageInput): Promise<IMessage> {
  const message = await Message.create({
    conversationId: input.conversationId,
    senderId,
    content: input.content,
    tempId: input.tempId,
    status: 'sent',
  });

  logger.info({ messageId: message._id, conversationId: input.conversationId, senderId }, 'Mensaje creado');

  try {
    const producer = getProducer();
    await producer.send({
      topic: 'message.events',
      messages: [
        {
          key: message._id.toString(),
          value: JSON.stringify({
            event: 'message.sent',
            messageId: message._id.toString(),
            conversationId: input.conversationId,
            senderId,
            timestamp: message.createdAt.toISOString(),
          }),
        },
      ],
    });
  } catch {
    logger.warn('Kafka no disponible, mensaje enviado sin evento');
  }

  return message;
}

export async function markAsDelivered(messageIds: string[]): Promise<void> {
  await Message.updateMany(
    { _id: { $in: messageIds }, status: 'sent' },
    { $set: { status: 'delivered' } },
  );
}

export async function markAsRead(messageIds: string[], readerId: string): Promise<string[]> {
  const result = await Message.updateMany(
    { _id: { $in: messageIds }, senderId: { $ne: readerId }, status: { $ne: 'read' } },
    { $set: { status: 'read' } },
  );

  const updated = await Message.find(
    { _id: { $in: messageIds }, senderId: { $ne: readerId } },
    { _id: 1, senderId: 1, status: 1 },
  ).lean();

  return updated.map(m => m._id.toString());
}

export async function getMessages(
  conversationId: string,
  options: { limit?: number; before?: string } = {},
): Promise<IMessage[]> {
  const limit = Math.min(options.limit || 50, 100);
  const filter: any = { conversationId };

  if (options.before) {
    filter._id = { $lt: options.before };
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return messages as unknown as IMessage[];
}
