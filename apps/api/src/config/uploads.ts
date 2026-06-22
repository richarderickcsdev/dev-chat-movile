import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from './env';

const uploadDir = path.resolve(env.MEDIA_LOCAL_PATH);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\./g, '')
    .replace(/[\\/]/g, '')
    .replace(/[^\w.-]/g, '_');
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext);
    const name = `${Date.now()}-${sanitizeFilename(base).slice(0, 32)}${ext}`;
    cb(null, name);
  },
});

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIMES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imagenes (jpeg, png, webp, gif)'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export function getAvatarUrl(filename: string): string {
  if (env.MEDIA_STORAGE === 's3') {
    return `https://s3.amazonaws.com/${filename}`;
  }
  return `/uploads/${filename}`;
}
