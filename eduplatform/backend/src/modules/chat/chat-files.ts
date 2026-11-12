import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'crypto';
import { mkdirSync, promises as fs } from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';

export const CHAT_FILE_MAX_BYTES = 20 * 1024 * 1024;
export const CHAT_FILE_MAX_NAME = 200;

// Ruxsat etilgan fayllar. MIME turi brauzer yuborganidan emas, kengaytmadan aniqlanadi.
// HTML/SVG/JS kabi brauzerda kod ishga tushirishi mumkin bo'lgan turlar ataylab yo'q.
export const CHAT_FILE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
  '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8',
  '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
};
const INLINE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']);

export const chatFilesDir = () => path.resolve(process.env.CHAT_FILES_DIR ?? './chat-files');
export const chatFileMime = (originalName: string): string | undefined => CHAT_FILE_TYPES[path.extname(originalName).toLowerCase()];
export const isInlineMime = (mime: string) => INLINE_TYPES.has(mime);

/** Multer latin1 sifatida o'qigan UTF-8 nomni tiklaydi va xavfsiz qiladi. */
export function cleanOriginalName(raw: string): string {
  let name = raw;
  try { const decoded = Buffer.from(raw, 'latin1').toString('utf8'); if (!decoded.includes('�')) name = decoded; } catch { /* asl nom qoladi */ }
  name = path.basename(name.replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f"]/g, '').trim();
  if (name.length > CHAT_FILE_MAX_NAME) { const ext = path.extname(name); name = name.slice(0, CHAT_FILE_MAX_NAME - ext.length) + ext; }
  return name || 'fayl';
}

export const chatMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, done) => { const dir = chatFilesDir(); mkdirSync(dir, { recursive: true }); done(null, dir); },
    filename: (_req, file, done) => done(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (_req, file, done) => chatFileMime(file.originalname)
    ? done(null, true)
    : done(new BadRequestException('Bu turdagi faylni yuborib bo‘lmaydi. Rasm, PDF, Word, Excel, PowerPoint, TXT, ZIP, MP3 yoki MP4 yuboring'), false),
  limits: { fileSize: CHAT_FILE_MAX_BYTES, files: 1 },
};

export async function removeChatFile(fileName: string | null | undefined): Promise<void> {
  if (!fileName || path.basename(fileName) !== fileName) return;
  try { await fs.unlink(path.join(chatFilesDir(), fileName)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
