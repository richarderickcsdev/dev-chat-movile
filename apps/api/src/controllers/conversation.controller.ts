import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as conversationService from '../services/conversation.service';
import * as messageService from '../services/message.service';
import { Message } from '../models/message';
import { getIO } from '../socket';
import { AppError } from '../middlewares/errorHandler';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

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

    const conversation = await conversationService.getConversationById(req.params.conversationId);
    if (conversation?.lastMessage?.senderId === req.user!.userId) {
      const lastMsg = await conversationService.findLastMessage(req.params.conversationId);
      if (lastMsg) {
        await conversationService.updateLastMessage(req.params.conversationId, {
          content: lastMsg.content.slice(0, 200),
          senderId: (lastMsg as any).senderId,
          createdAt: new Date((lastMsg as any).createdAt),
        });
      } else {
        await conversationService.clearLastMessage(req.params.conversationId);
      }
    }

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

    const conversation = await conversationService.getConversationById(req.params.conversationId);
    if (conversation?.lastMessage?.senderId === req.user!.userId) {
      await conversationService.updateLastMessage(req.params.conversationId, {
        content: content.slice(0, 200),
        senderId: req.user!.userId,
        createdAt: msg.createdAt,
      });
    }

    res.json({ _id: msg._id.toString(), content: msg.content });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(400, 'Datos invalidos'));
    } else {
      next(err as Error);
    }
  }
}

export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError(400, 'Archivo de imagen requerido');

    const inputPath = req.file.path;
    const outputFilename = `msg-${req.file.filename}`;
    const outputPath = path.join(path.dirname(inputPath), outputFilename);

    const metadata = await sharp(inputPath).metadata();

    await sharp(inputPath)
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toFile(outputPath);

    fs.unlinkSync(inputPath);

    const imageUrl = `/uploads/${outputFilename}`;

    const message = await messageService.createMessage(req.user!.userId, {
      conversationId: req.params.conversationId,
      content: 'Imagen',
      tempId: `img_${Date.now()}`,
    });

    const updated = await Message.findByIdAndUpdate(
      message._id,
      { type: 'image', imageUrl, imageWidth: metadata.width || 0, imageHeight: metadata.height || 0 },
      { new: true },
    );

    await conversationService.updateLastMessage(req.params.conversationId, {
      content: 'Imagen',
      senderId: req.user!.userId,
      createdAt: message.createdAt,
    });

    const io = getIO();
    io.to(req.params.conversationId).emit('message:new', {
      _id: message._id.toString(),
      conversationId: req.params.conversationId,
      senderId: req.user!.userId,
      content: 'Imagen',
      type: 'image',
      imageUrl,
      imageWidth: metadata.width || 0,
      imageHeight: metadata.height || 0,
      status: 'sent',
      createdAt: message.createdAt.toISOString(),
    });

    res.status(201).json({ _id: message._id.toString(), imageUrl });
  } catch (err) {
    next(err as Error);
  }
}
