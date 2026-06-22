import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as userService from '../services/user.service';
import { AppError } from '../middlewares/errorHandler';
import { getAvatarUrl } from '../config/uploads';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(160).optional(),
});

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.findOrCreateByPhone(req.user!.phone);
    res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    });
  } catch (err) {
    next(err as Error);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await userService.findOrCreateByPhone(req.user!.phone);
    const updated = await userService.updateProfile(user.id, data);
    res.json({
      id: updated.id,
      phone: updated.phone,
      name: updated.name,
      bio: updated.bio,
      avatar_url: updated.avatar_url,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(400, 'Datos invalidos: ' + err.issues.map(e => e.message).join(', ')));
    } else {
      next(err as Error);
    }
  }
}

export async function uploadAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError(400, 'Archivo de imagen requerido');
    }

    const inputPath = req.file.path;
    const outputFilename = `avatar-${req.file.filename}`;
    const outputPath = path.join(path.dirname(inputPath), outputFilename);

    await sharp(inputPath)
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(outputPath);

    fs.unlinkSync(inputPath);

    const avatarUrl = getAvatarUrl(outputFilename);
    const user = await userService.findOrCreateByPhone(req.user!.phone);
    const updated = await userService.updateProfile(user.id, { avatar_url: avatarUrl });

    res.json({
      id: updated.id,
      avatar_url: updated.avatar_url,
    });
  } catch (err) {
    next(err as Error);
  }
}

export async function searchUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const phone = req.query.phone as string;
    if (!phone || phone.length < 3) {
      return next(new AppError(400, 'Ingresa al menos 3 caracteres'));
    }
    const users = await userService.searchByPhone(phone);
    res.json({ users });
  } catch (err) {
    next(err as Error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await userService.findByIdPublic(req.params.id);
    res.json(profile);
  } catch (err) {
    next(err as Error);
  }
}
