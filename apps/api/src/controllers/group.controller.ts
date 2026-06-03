import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as groupService from '../services/group.service';
import { getIO } from '../socket';
import { AppError } from '../middlewares/errorHandler';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string().min(1)).min(1).max(500),
});

const addMembersSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1).max(500),
});

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, memberIds } = createSchema.parse(req.body);
    const group = await groupService.createGroup(name, req.user!.userId, memberIds);

    const io = getIO();
    for (const mid of group.members) {
      io.to(mid).emit('group:new', group);
    }

    res.status(201).json(group);
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
    const groups = await groupService.listGroups(req.user!.userId);
    res.json({ groups });
  } catch (err) {
    next(err as Error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const group = await groupService.getGroupById(req.params.id);
    res.json(group);
  } catch (err) {
    next(err as Error);
  }
}

export async function addMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const { memberIds } = addMembersSchema.parse(req.body);
    const group = await groupService.addMembers(req.params.id, req.user!.userId, memberIds);

    const io = getIO();
    io.to(req.params.id).emit('group:updated', group);
    for (const mid of memberIds) {
      io.to(mid).emit('group:new', group);
    }

    res.json(group);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(400, 'Datos invalidos'));
    } else {
      next(err as Error);
    }
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    await groupService.removeMember(req.params.id, req.user!.userId, req.params.userId);

    const io = getIO();
    io.to(req.params.id).emit('group:updated', { _id: req.params.id, removedMember: req.params.userId });
    io.to(req.params.userId).emit('group:removed', { _id: req.params.id });

    res.json({ message: 'Miembro eliminado' });
  } catch (err) {
    next(err as Error);
  }
}
