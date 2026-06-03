import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as contactService from '../services/contact.service';
import { AppError } from '../middlewares/errorHandler';

const syncSchema = z.object({
  phones: z.array(z.string().min(10).max(15)).min(1).max(5000),
});

export async function sync(req: Request, res: Response, next: NextFunction) {
  try {
    const { phones } = syncSchema.parse(req.body);
    const contacts = await contactService.syncContacts(req.user!.phone, phones);
    res.json({ contacts });
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
    const contacts = await contactService.listContacts(req.user!.phone);
    res.json({ contacts });
  } catch (err) {
    next(err as Error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await contactService.removeContact(req.params.id, req.user!.phone);
    res.json({ message: 'Contacto eliminado' });
  } catch (err) {
    next(err as Error);
  }
}
