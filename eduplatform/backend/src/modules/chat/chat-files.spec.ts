import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { chatFileMime, cleanOriginalName, isInlineMime } from './chat-files';
import { ChatService } from './chat.service';

describe('chat-files helpers', () => {
  it('derives MIME from the extension and rejects dangerous types', () => {
    expect(chatFileMime('Hisobot.PDF')).toBe('application/pdf');
    expect(chatFileMime('rasm.jpeg')).toBe('image/jpeg');
    expect(chatFileMime('vazifa.docx')).toContain('wordprocessingml');
    for (const bad of ['x.html', 'x.svg', 'x.js', 'x.exe', 'noext']) expect(chatFileMime(bad)).toBeUndefined();
  });
  it('only renders images and PDF inline', () => {
    expect(isInlineMime('image/png')).toBe(true);
    expect(isInlineMime('application/pdf')).toBe(true);
    expect(isInlineMime('application/zip')).toBe(false);
  });
  it('restores UTF-8 names from multer latin1 and strips paths/control chars', () => {
    const latin1 = Buffer.from('O‘quv reja.pdf', 'utf8').toString('latin1');
    expect(cleanOriginalName(latin1)).toBe('O‘quv reja.pdf');
    expect(cleanOriginalName('../../etc/"pass\u0001wd".txt')).toBe('passwd.txt');
    expect(cleanOriginalName('a'.repeat(300) + '.pdf')).toHaveLength(200);
    expect(cleanOriginalName('')).toBe('fayl');
  });
});

describe('ChatService attachments', () => {
  const T = '2026-10-03T10:00:00Z';
  const users: Record<string, any> = { s1: { id: 's1', role: 'STUDENT', firstName: 'A', lastName: 'B' }, t1: { id: 't1', role: 'TEACHER', firstName: 'C', lastName: 'D' }, s2: { id: 's2', role: 'STUDENT', firstName: 'E', lastName: 'F' } };
  let dir: string;
  beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-')); process.env.CHAT_FILES_DIR = dir; });
  afterEach(async () => { delete process.env.CHAT_FILES_DIR; await fs.rm(dir, { recursive: true, force: true }); });

  const make = (message: any = null) => {
    const tx: any = { message: { count: jest.fn().mockResolvedValue(0), create: jest.fn(async ({ data }: any) => ({ id: 'm1', createdAt: new Date(T), readAt: null, ...data })) }, conversation: { update: jest.fn() } };
    const prisma: any = {
      user: { findUnique: jest.fn(async ({ where }: any) => users[where.id] ?? null), findMany: jest.fn(async () => [users.s1, users.t1]) },
      conversation: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', studentId: 's1', teacherId: 't1' }) },
      message: { findUnique: jest.fn().mockResolvedValue(message), count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };
    return { service: new ChatService(prisma, { emitToUser: jest.fn() } as any), tx };
  };
  const upload = async (originalname: string) => {
    const filename = `u-${Math.random().toString(36).slice(2)}${path.extname(originalname).toLowerCase()}`;
    await fs.writeFile(path.join(dir, filename), 'data');
    return { filename, originalname, size: 4 } as Express.Multer.File;
  };

  it('stores the attachment with server-side MIME and allows a file without text', async () => {
    const { service, tx } = make();
    const file = await upload('vazifa.pdf');
    const dto = await service.sendAttachment('s1', 'c1', file, '  ');
    expect(tx.message.create.mock.calls[0][0].data).toMatchObject({ body: '', attachmentFile: file.filename, attachmentName: 'vazifa.pdf', attachmentMime: 'application/pdf', attachmentSize: 4 });
    expect(dto.attachment).toEqual({ name: 'vazifa.pdf', mimeType: 'application/pdf', size: 4 });
    expect(dto).not.toHaveProperty('attachmentFile');
  });

  it('deletes the uploaded file when sending fails (e.g. not a participant)', async () => {
    const { service } = make();
    const file = await upload('a.png');
    await expect(service.sendAttachment('s2', 'c1', file)).rejects.toBeInstanceOf(NotFoundException);
    await expect(fs.access(path.join(dir, file.filename))).rejects.toThrow();
  });

  it('rejects a missing file', async () => {
    await expect(make().service.sendAttachment('s1', 'c1', undefined)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('serves the file only to participants', async () => {
    const msg = { conversationId: 'c1', attachmentFile: 'x.pdf', attachmentName: 'Reja.pdf', attachmentMime: 'application/pdf' };
    const ok = await make(msg).service.attachment('t1', 'm1');
    expect(ok).toEqual({ filePath: path.join(dir, 'x.pdf'), name: 'Reja.pdf', mimeType: 'application/pdf', inline: true });
    await expect(make(msg).service.attachment('s2', 'm1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(make({ ...msg, attachmentFile: null }).service.attachment('s1', 'm1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(make({ ...msg, attachmentFile: '../secret' }).service.attachment('s1', 'm1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

it('chat controller has no role restriction beyond the service checks', () => {
  const { ChatController } = require('./chat.controller');
  expect(Reflect.getMetadata(ROLES_KEY, ChatController)).toBeUndefined();
});
