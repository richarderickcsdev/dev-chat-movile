import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { AppError } from '../middlewares/errorHandler';

const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15).regex(/^\d+$/),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15).regex(/^\d+$/),
  code: z.string().length(6).regex(/^\d{6}$/),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function formatZodError(err: z.ZodError): string {
  return 'Datos invalidos: ' + err.issues.map(e => e.message).join(', ');
}

export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone } = sendOtpSchema.parse(req.body);
    await authService.sendOtp(phone);
    res.json({ message: 'Codigo enviado' });
  } catch (err) {
    if (err instanceof z.ZodError) next(new AppError(400, formatZodError(err)));
    else if (err instanceof AppError) next(err);
    else next(err as Error);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, code } = verifyOtpSchema.parse(req.body);
    const result = await authService.verifyOtpAndLogin(phone, code);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) next(new AppError(400, formatZodError(err)));
    else if (err instanceof AppError) next(err);
    else next(err as Error);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) next(new AppError(400, 'Datos invalidos'));
    else if (err instanceof AppError) next(err);
    else next(err as Error);
  }
}
