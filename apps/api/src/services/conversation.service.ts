import { Conversation, IConversation } from '../models/conversation';
import { Message } from '../models/message';
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

export async function listConversations(userId: string): Promise<IConversation[]> {
  const conversations = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .lean();

  return conversations as unknown as IConversation[];
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
