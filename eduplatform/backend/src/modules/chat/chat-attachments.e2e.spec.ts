import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { promises as fs } from 'fs';
import { AddressInfo } from 'net';
import * as os from 'os';
import * as path from 'path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

// Haqiqiy HTTP + multer + diskka yozish; Prisma xotirada soxtalashtirilgan.
describe('Chat attachments over HTTP', () => {
  let app: INestApplication;
  let base: string;
  let dir: string;
  const users: Record<string, any> = { s1: { id: 's1', role: 'STUDENT', firstName: 'A', lastName: 'B' }, t1: { id: 't1', role: 'TEACHER', firstName: 'C', lastName: 'D' }, s2: { id: 's2', role: 'STUDENT', firstName: 'E', lastName: 'F' } };
  const messages: any[] = [];

  const prisma = {
    user: { findUnique: async ({ where }: any) => users[where.id] ?? null, findMany: async () => [users.s1, users.t1] },
    conversation: { findUnique: async ({ where }: any) => (where.id === 'c1' ? { id: 'c1', studentId: 's1', teacherId: 't1' } : null), update: async () => ({}) },
    message: {
      count: async () => 0,
      findUnique: async ({ where }: any) => messages.find(m => m.id === where.id) ?? null,
      create: async ({ data }: any) => { const m = { id: `m${messages.length + 1}`, createdAt: new Date(), readAt: null, ...data }; messages.push(m); return m; },
    },
    $transaction: async (fn: any) => fn(prisma),
  };

  const as = (userId: string) => ({ 'x-user': userId });
  const upload = (userId: string, name: string, content: Uint8Array | string, body?: string, conversation = 'c1') => {
    const form = new FormData();
    form.append('file', new Blob([typeof content === 'string' ? content : new Uint8Array(content)]), name);
    if (body !== undefined) form.append('body', body);
    return fetch(`${base}/chat/conversations/${conversation}/attachments`, { method: 'POST', headers: as(userId), body: form });
  };
  const filesOnDisk = async () => (await fs.readdir(dir).catch(() => [])).length;

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-e2e-'));
    process.env.CHAT_FILES_DIR = dir;
    const moduleRef = await Test.createTestingModule({ controllers: [ChatController], providers: [ChatService, { provide: PrismaService, useValue: prisma }, { provide: ChatGateway, useValue: { emitToUser: () => undefined } }] })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: (ctx: ExecutionContext) => { const req = ctx.switchToHttp().getRequest(); req.user = { sub: req.headers['x-user'] }; return true; } })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.listen(0);
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });
  afterAll(async () => { await app.close(); delete process.env.CHAT_FILES_DIR; await fs.rm(dir, { recursive: true, force: true }); });

  it('uploads a file with a caption and lets both participants download it', async () => {
    const res = await upload('s1', 'O‘quv reja.pdf', '%PDF-1.4 test', 'Mana vazifa');
    expect(res.status).toBe(201);
    const msg = await res.json();
    expect(msg).toMatchObject({ body: 'Mana vazifa', attachment: { name: 'O‘quv reja.pdf', mimeType: 'application/pdf', size: 13 } });
    expect(await filesOnDisk()).toBe(1);

    for (const reader of ['s1', 't1']) {
      const dl = await fetch(`${base}/chat/messages/${msg.id}/attachment`, { headers: as(reader) });
      expect(dl.status).toBe(200);
      expect(await dl.text()).toBe('%PDF-1.4 test');
      expect(dl.headers.get('content-type')).toBe('application/pdf');
      expect(dl.headers.get('x-content-type-options')).toBe('nosniff');
      expect(dl.headers.get('content-disposition')).toBe(`inline; filename*=UTF-8''${encodeURIComponent('O‘quv reja.pdf')}`);
    }
  });

  it('hides the file from a non-participant', async () => {
    const res = await fetch(`${base}/chat/messages/m1/attachment`, { headers: as('s2') });
    expect(res.status).toBe(404);
  });

  it('sends a file without a caption; non-inline types download as attachment', async () => {
    const res = await upload('t1', 'jadval.xlsx', 'PK..');
    expect(res.status).toBe(201);
    const msg = await res.json();
    expect(msg.body).toBe('');
    const dl = await fetch(`${base}/chat/messages/${msg.id}/attachment`, { headers: as('s1') });
    expect(dl.headers.get('content-disposition')).toMatch(/^attachment;/);
  });

  it('rejects disallowed types and leaves nothing on disk', async () => {
    const before = await filesOnDisk();
    const res = await upload('s1', 'page.html', '<script>alert(1)</script>');
    expect(res.status).toBe(400);
    expect(await filesOnDisk()).toBe(before);
  });

  it('removes the stored file when the sender is not in the conversation', async () => {
    const before = await filesOnDisk();
    const res = await upload('s2', 'a.png', 'png');
    expect(res.status).toBe(404);
    expect(await filesOnDisk()).toBe(before);
  });

  it('rejects files over 20 MB', async () => {
    const before = await filesOnDisk();
    const res = await upload('s1', 'katta.zip', new Uint8Array(20 * 1024 * 1024 + 1));
    expect(res.status).toBe(413);
    expect(await filesOnDisk()).toBe(before);
  });
});
