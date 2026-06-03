import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../lib/logger';

export async function connectMongo(): Promise<void> {
  mongoose.connection.on('connected', () => logger.info('MongoDB conectado'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB desconectado'));

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
}
