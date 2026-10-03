import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';

export const VIDEO_MAX_BYTES = 200 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = { '.mp4': 'video/mp4', '.webm': 'video/webm' };

export const uploadRoot = () => path.resolve(process.env.UPLOAD_DIR ?? './uploads');
export const videosDir = () => path.join(uploadRoot(), 'videos');

export function isAllowedVideo(originalName: string, mimeType: string): boolean {
  return MIME_BY_EXTENSION[path.extname(originalName).toLowerCase()] === mimeType;
}

export const videoMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, done) => { const dir = videosDir(); mkdirSync(dir, { recursive: true }); done(null, dir); },
    filename: (_req, file, done) => done(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (_req, file, done) => isAllowedVideo(file.originalname, file.mimetype) ? done(null, true) : done(new BadRequestException('Faqat mp4 va webm formatdagi video qabul qilinadi'), false),
  limits: { fileSize: VIDEO_MAX_BYTES },
};
