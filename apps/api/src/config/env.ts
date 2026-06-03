import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const candidates = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '../../.env.local'),
];

const envPath = candidates.find(p => fs.existsSync(p));
if (!envPath) throw new Error('.env.local no encontrado');

dotenv.config({ path: envPath });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  MONGODB_URI: process.env.MONGODB_URI || '',
  REDIS_URL: process.env.REDIS_URL || '',
  KAFKA_BROKERS: (process.env.KAFKA_BROKERS || '127.0.0.1:9092').split(','),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  OTP_BYPASS_CODE: process.env.OTP_BYPASS_CODE || '',
  MEDIA_STORAGE: (process.env.MEDIA_STORAGE || 'local') as 'local' | 's3',
  MEDIA_LOCAL_PATH: process.env.MEDIA_LOCAL_PATH || './uploads',
};

const required = ['DATABASE_URL', 'MONGODB_URI', 'REDIS_URL'];
for (const key of required) {
  if (!env[key as keyof typeof env]) {
    console.error(`Variable de entorno faltante: ${key}`);
    process.exit(1);
  }
}
