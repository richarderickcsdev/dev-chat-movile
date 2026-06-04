import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as conversationService from '../services/conversation.service';
import * as messageService from '../services/message.service';
import { getIO } from '../socket';
import { AppError } from '../middlewares/errorHandler';

const createSchema = z.object({
  participantId: z.string().min(1),
});

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { participantId } = createSchema.parse(req.body);
    const participants = [req.user!.userId, participantId];
    const conversation = await conversationService.createConversation(participants);

    const io = getIO();
    for (const pid of participants) {
      io.to(pid).emit('conversation:new', conversation);
    }

    res.status(201).json(conversation);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(400, 'Datos invalidos: ' + err.issues.map(e => e.message).join(', ')));
    } else {
      next(err as Error);
    }
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const conversations = await conversationService.listConversations(req.user!.userId);
    res.json({ conversations });
  } catch (err) {
    next(err as Error);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const conversation = await conversationService.getConversationById(req.params.id);
    if (!conversation) {
      return next(new AppError(404, 'Conversacion no encontrada'));
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before as string | undefined;

    const messages = await conversationService.getConversationMessages(req.params.id, { limit, before });
    res.json({ messages });
  } catch (err) {
    next(err as Error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await conversationService.deleteConversation(req.params.id);
    res.json({ message: 'Conversacion eliminada' });
  } catch (err) {
    next(err as Error);
  }
}

export async function deleteMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const msg = await messageService.deleteMessage(
      req.params.messageId,
      req.user!.userId,
    );
    if (!msg) return next(new AppError(404, 'Mensaje no encontrado o no autorizado'));
    res.json({ message: 'Mensaje eliminado', _id: req.params.messageId });
  } catch (err) {
    next(err as Error);
  }
}

export async function editMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({ content: z.string().min(1).max(5000) });
    const { content } = schema.parse(req.body);
    const msg = await messageService.editMessage(
      req.params.messageId,
      req.user!.userId,
      content,
    );
    if (!msg) return next(new AppError(404, 'Mensaje no encontrado o no autorizado'));
    res.json({ _id: msg._id.toString(), content: msg.content });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(400, 'Datos invalidos'));
    } else {
      next(err as Error);
    }
  }
}
