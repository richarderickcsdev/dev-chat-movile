import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    logger.warn({ statusCode: err.statusCode }, err.message);
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error({ err }, 'Error no manejado');
  return res.status(500).json({ error: 'Error interno del servidor' });
}
