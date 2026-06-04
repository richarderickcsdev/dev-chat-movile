import { Conversation, IConversation } from '../models/conversation';
import { Message } from '../models/message';
import { findByIdPublic } from './user.service';
import { redis } from '../config/redis';
import { logger } from '../lib/logger';

export async function createConversation(participants: string[]): Promise<IConversation> {
  const sorted = [...participants].sort();

  const existing = await Conversation.findOne({
    participants: { $eq: sorted, $size: sorted.length },
  });

  if (existing) {
    return existing;
  }

  const conversation = await Conversation.create({ participants: sorted });
  logger.info({ conversationId: conversation._id, participants: sorted }, 'Conversacion creada');
  return conversation;
}

export async function listConversations(userId: string) {
  const conversations = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .lean();

  const enriched = await Promise.all(
    conversations.map(async (conv: any) => {
      const partnerId = conv.participants.find((p: string) => p !== userId);
      let partner = null;
      if (partnerId) {
        try {
          partner = await findByIdPublic(partnerId);
        } catch {
          partner = { id: partnerId, name: '', bio: '', avatar_url: '' };
        }
      }

      const online = partnerId ? (await redis.get(`io:online:${partnerId}`)) !== null : false;

      return {
        _id: conv._id.toString(),
        participants: conv.participants,
        partner: partner ? {
          id: partner.id,
          name: partner.name || partnerId,
          avatar_url: partner.avatar_url,
        } : null,
        lastMessage: conv.lastMessage || null,
        online,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    }),
  );

  return enriched;
}

export async function getConversationById(id: string): Promise<IConversation | null> {
  return Conversation.findById(id).lean() as Promise<IConversation | null>;
}

export async function getConversationMessages(
  conversationId: string,
  options: { limit?: number; before?: string } = {},
) {
  const limit = Math.min(options.limit || 50, 100);
  const filter: any = { conversationId };
  if (options.before) {
    filter._id = { $lt: options.before };
  }
  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return messages;
}

export async function updateLastMessage(
  conversationId: string,
  message: { content: string; senderId: string; createdAt: Date },
): Promise<void> {
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: {
      content: message.content.slice(0, 200),
      senderId: message.senderId,
      createdAt: message.createdAt,
    },
    updatedAt: new Date(),
  });
}

export async function clearLastMessage(conversationId: string): Promise<void> {
  await Conversation.findByIdAndUpdate(conversationId, {
    $unset: { lastMessage: '' },
  });
}

export async function findLastMessage(conversationId: string) {
  const message = await Message.findOne({ conversationId })
    .sort({ createdAt: -1 })
    .lean();
  return message;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await Conversation.findByIdAndDelete(conversationId);
  await Message.deleteMany({ conversationId });
  logger.info({ conversationId }, 'Conversacion eliminada');
}
