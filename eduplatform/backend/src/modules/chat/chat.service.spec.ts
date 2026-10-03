import { BadRequestException, ForbiddenException, HttpException, Logger, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';

const u = (id: string, role: string, over: any = {}) => ({ id, role, firstName: `F${id}`, lastName: `L${id}`, email: `${id}@x.uz`, ...over });
const conv = (over: any = {}) => ({ id: 'c1', studentId: 's1', teacherId: 't1', student: u('s1', 'STUDENT'), teacher: u('t1', 'TEACHER'), messages: [], _count: { messages: 0 }, lastMessageAt: new Date('2026-10-01T00:00:00Z'), ...over });

function setup(users: Record<string, any> = {}, over: any = {}) {
  const prisma: any = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => users[where.id] ?? null),
      findMany: jest.fn(async ({ where }: any = {}) => (where?.id?.in ? where.id.in.map((id: string) => users[id]).filter(Boolean) : [])),
    },
    conversation: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(async ({ data }: any) => conv({ id: 'new', ...data })),
      update: jest.fn(async ({ data }: any) => conv(data)),
      ...over,
    },
    message: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(async ({ data }: any) => ({ id: 'm1', createdAt: new Date('2026-10-03T10:00:00Z'), readAt: null, ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const gateway = { emitToUser: jest.fn() };
  return { service: new ChatService(prisma, gateway as any), prisma, gateway };
}

describe('ChatService actor', () => {
  it('rejects ADMIN and unknown users', async () => {
    const { service } = setup({ a1: u('a1', 'ADMIN') });
    await expect((service as any).actor('a1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect((service as any).actor('nope')).rejects.toThrow('Chat faqat talaba va o‘qituvchilar uchun');
  });
  it('uses the role stored in the database', async () => {
    const { service, prisma } = setup({ x: u('x', 'TEACHER') });
    expect((await (service as any).actor('x')).role).toBe('TEACHER');
    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'x' } }));
  });
});

describe('ChatService.contacts', () => {
  it('gives a student only teachers, without email', async () => {
    const { service, prisma } = setup({ s1: u('s1', 'STUDENT') });
    prisma.user.findMany.mockResolvedValue([u('t1', 'TEACHER')]);
    const result = await service.contacts('s1');
    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({ role: 'TEACHER' });
    expect(result).toEqual([{ id: 't1', firstName: 'Ft1', lastName: 'Lt1', role: 'TEACHER' }]);
    expect(result[0]).not.toHaveProperty('email');
  });
  it('gives a teacher only students, with email', async () => {
    const { service, prisma } = setup({ t1: u('t1', 'TEACHER') });
    prisma.user.findMany.mockResolvedValue([u('s1', 'STUDENT')]);
    const result = await service.contacts('t1');
    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({ role: 'STUDENT' });
    expect(result[0]).toMatchObject({ id: 's1', role: 'STUDENT', email: 's1@x.uz' });
  });
  it('filters by name and email with contains', async () => {
    const { service, prisma } = setup({ s1: u('s1', 'STUDENT') });
    await service.contacts('s1', 'ali');
    expect(prisma.user.findMany.mock.calls[0][0].where.OR).toEqual([
      { firstName: { contains: 'ali' } }, { lastName: { contains: 'ali' } }, { email: { contains: 'ali' } },
    ]);
  });
  it('defaults limit to 50 and caps it at 100', async () => {
    const { service, prisma } = setup({ s1: u('s1', 'STUDENT') });
    await service.contacts('s1');
    expect(prisma.user.findMany.mock.calls[0][0].take).toBe(50);
    await service.contacts('s1', undefined, 5000);
    expect(prisma.user.findMany.mock.calls[1][0].take).toBe(100);
  });
});

describe('ChatService.openConversation', () => {
  const users = { s1: u('s1', 'STUDENT'), t1: u('t1', 'TEACHER'), t2: u('t2', 'TEACHER'), s2: u('s2', 'STUDENT'), a1: u('a1', 'ADMIN') };
  it('places student and teacher correctly when the student starts', async () => {
    const { service, prisma } = setup(users);
    await service.openConversation('s1', 't1');
    expect(prisma.conversation.create.mock.calls[0][0].data).toMatchObject({ studentId: 's1', teacherId: 't1' });
  });
  it('places student and teacher correctly when the teacher starts', async () => {
    const { service, prisma } = setup(users);
    await service.openConversation('t1', 's1');
    expect(prisma.conversation.create.mock.calls[0][0].data).toMatchObject({ studentId: 's1', teacherId: 't1' });
  });
  it('does not create a new conversation when one exists', async () => {
    const { service, prisma } = setup(users, { findUnique: jest.fn().mockResolvedValue(conv()) });
    const dto = await service.openConversation('s1', 't1');
    expect(prisma.conversation.create).not.toHaveBeenCalled();
    expect(dto).toMatchObject({ id: 'c1', lastMessage: null, unreadCount: 0 });
    expect(dto.other).toMatchObject({ id: 't1', role: 'TEACHER' });
    expect(dto.other).not.toHaveProperty('email');
  });
  it('rejects invalid pairs', async () => {
    const { service } = setup(users);
    await expect(service.openConversation('s1', 's2')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.openConversation('t1', 't2')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.openConversation('s1', 'a1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.openConversation('s1', 's1')).rejects.toBeInstanceOf(BadRequestException);
  });
  it('throws NotFound for an unknown other user', async () => {
    const { service } = setup(users);
    await expect(service.openConversation('s1', 'ghost')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('re-reads the existing conversation on a unique constraint race', async () => {
    const existing = conv({ id: 'raced' });
    const findUnique = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    const create = jest.fn().mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    const { service } = setup(users, { findUnique, create });
    expect((await service.openConversation('s1', 't1')).id).toBe('raced');
  });
  it('rethrows other create errors', async () => {
    const create = jest.fn().mockRejectedValue(new Error('boom'));
    const { service } = setup(users, { create });
    await expect(service.openConversation('s1', 't1')).rejects.toThrow('boom');
  });
});

describe('ChatService.conversations', () => {
  it('orders by lastMessageAt desc and maps unread and lastMessage', async () => {
    const { service, prisma } = setup({ s1: u('s1', 'STUDENT') });
    const last = new Date('2026-10-02T10:00:00Z');
    prisma.conversation.findMany.mockResolvedValue([
      conv({ id: 'c1', messages: [{ body: 'salom', senderId: 't1', createdAt: last }], _count: { messages: 3 } }),
      conv({ id: 'c2', teacherId: 't2', teacher: u('t2', 'TEACHER') }),
    ]);
    const result = await service.conversations('s1');
    const args = prisma.conversation.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ lastMessageAt: 'desc' });
    expect(args.where).toEqual({ OR: [{ studentId: 's1' }, { teacherId: 's1' }] });
    expect(args.include._count.select.messages.where).toEqual({ senderId: { not: 's1' }, readAt: null });
    expect(result[0]).toEqual({
      id: 'c1', other: { id: 't1', firstName: 'Ft1', lastName: 'Lt1', role: 'TEACHER' },
      lastMessage: { body: 'salom', senderId: 't1', createdAt: last.toISOString() }, unreadCount: 3,
    });
    expect(result[1].lastMessage).toBeNull();
    expect(result[1].unreadCount).toBe(0);
  });
  it('shows a teacher the student email', async () => {
    const { service, prisma } = setup({ t1: u('t1', 'TEACHER') });
    prisma.conversation.findMany.mockResolvedValue([conv()]);
    expect((await service.conversations('t1'))[0].other).toMatchObject({ id: 's1', role: 'STUDENT', email: 's1@x.uz' });
  });
});

describe('ChatService.assertParticipant', () => {
  it('returns the conversation for a participant', async () => {
    const { service } = setup({}, { findUnique: jest.fn().mockResolvedValue(conv()) });
    expect((await (service as any).assertParticipant('s1', 'c1')).id).toBe('c1');
  });
  it('throws the same NotFound for non-participants and missing conversations', async () => {
    const a = setup({}, { findUnique: jest.fn().mockResolvedValue(conv()) });
    const b = setup({}, { findUnique: jest.fn().mockResolvedValue(null) });
    await expect((a.service as any).assertParticipant('other', 'c1')).rejects.toThrow(new NotFoundException('Suhbat topilmadi'));
    await expect((b.service as any).assertParticipant('s1', 'c1')).rejects.toThrow(new NotFoundException('Suhbat topilmadi'));
  });
});

const msg = (id: string, at: string, over: any = {}) => ({ id, conversationId: 'c1', senderId: 't1', body: id, createdAt: new Date(at), readAt: null, ...over });
const T = '2026-10-03T10:00:00Z';

describe('ChatService.send', () => {
  const users = { s1: u('s1', 'STUDENT'), t1: u('t1', 'TEACHER') };
  const make = () => setup(users, { findUnique: jest.fn().mockResolvedValue(conv()) });

  it('rejects when the counterparty role is no longer valid, in both directions', async () => {
    const cases: [string, any][] = [
      ['s1', { s1: u('s1', 'STUDENT'), t1: u('t1', 'STUDENT') }],
      ['s1', { s1: u('s1', 'STUDENT'), t1: u('t1', 'ADMIN') }],
      ['t1', { s1: u('s1', 'TEACHER'), t1: u('t1', 'TEACHER') }],
      ['t1', { s1: u('s1', 'ADMIN'), t1: u('t1', 'TEACHER') }],
    ];
    for (const [sender, map] of cases) {
      const { service, prisma, gateway } = setup(map, { findUnique: jest.fn().mockResolvedValue(conv()) });
      await expect(service.send(sender, 'c1', 'hi')).rejects.toThrow(new ForbiddenException('Chat faqat talaba va o‘qituvchilar uchun'));
      expect(prisma.message.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    }
  });
  it('teacher can send to the student (emits to the right users)', async () => {
    const { service, gateway } = make();
    const dto = await service.send('t1', 'c1', 'hi');
    expect(gateway.emitToUser.mock.calls.map(c => [c[0], c[1]])).toEqual([['t1', 'chat:message'], ['s1', 'chat:message'], ['s1', 'chat:unread']]);
    expect(dto.senderId).toBe('t1');
  });
  it('trims the body and stores it', async () => {
    const { service, prisma } = make();
    const dto = await service.send('s1', 'c1', '  salom  ');
    expect(prisma.message.create.mock.calls[0][0].data).toEqual({ conversationId: 'c1', senderId: 's1', body: 'salom' });
    expect(dto).toEqual({ id: 'm1', conversationId: 'c1', senderId: 's1', body: 'salom', createdAt: new Date(T).toISOString(), readAt: null });
  });
  it('rejects empty, whitespace-only and 2001 char bodies', async () => {
    const { service, prisma } = make();
    for (const body of ['', '   \n ', 'a'.repeat(2001)]) await expect(service.send('s1', 'c1', body)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
  it('accepts exactly 2000 chars', async () => {
    const { service } = make();
    expect((await service.send('s1', 'c1', 'a'.repeat(2000))).body).toHaveLength(2000);
  });
  it('stores HTML unchanged', async () => {
    const { service } = make();
    expect((await service.send('s1', 'c1', '<script>alert(1)</script>')).body).toBe('<script>alert(1)</script>');
  });
  it('updates lastMessageAt to the message createdAt in one transaction', async () => {
    const { service, prisma } = make();
    await service.send('s1', 'c1', 'hi');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.conversation.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { lastMessageAt: new Date(T) } });
  });
  it('returns 429 when 30 messages were sent in the last minute', async () => {
    const { service, prisma } = make();
    prisma.message.count.mockResolvedValue(30);
    const err: any = await service.send('s1', 'c1', 'hi').catch(e => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
    const where = prisma.message.count.mock.calls[0][0].where;
    expect(where.senderId).toBe('s1');
    const age = Date.now() - where.createdAt.gte.getTime();
    expect(age).toBeGreaterThanOrEqual(59000);
    expect(age).toBeLessThan(62000);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
  it('allows the 30th message (29 already sent)', async () => {
    const { service, prisma } = make();
    prisma.message.count.mockResolvedValue(29);
    await expect(service.send('s1', 'c1', 'hi')).resolves.toBeDefined();
  });
  it('throws 404 for a non-participant and writes nothing', async () => {
    const { service, prisma } = setup({ ...users, x1: u('x1', 'STUDENT') }, { findUnique: jest.fn().mockResolvedValue(conv()) });
    await expect(service.send('x1', 'c1', 'hi')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(prisma.conversation.update).not.toHaveBeenCalled();
  });
  it('emits message to sender, message to receiver, then unread to receiver', async () => {
    const { service, prisma, gateway } = make();
    prisma.message.count.mockResolvedValue(4);
    const dto = await service.send('s1', 'c1', 'hi');
    expect(gateway.emitToUser.mock.calls).toEqual([
      ['s1', 'chat:message', { message: dto }],
      ['t1', 'chat:message', { message: dto }],
      ['t1', 'chat:unread', { total: 4 }],
    ]);
  });
  it('still returns the message and logs when emitting throws', async () => {
    const { service, gateway } = make();
    gateway.emitToUser.mockImplementation(() => { throw new Error('ws down'); });
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    await expect(service.send('s1', 'c1', 'hi')).resolves.toMatchObject({ id: 'm1' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('ChatService.messages', () => {
  const users = { s1: u('s1', 'STUDENT') };
  const make = () => setup(users, { findUnique: jest.fn().mockResolvedValue(conv()) });

  it('returns the newest page in ascending order with hasMore', async () => {
    const { service, prisma } = make();
    prisma.message.findMany.mockResolvedValue([msg('m3', '2026-10-03T10:03:00Z'), msg('m2', '2026-10-03T10:02:00Z'), msg('m1', '2026-10-03T10:01:00Z')]);
    const result = await service.messages('s1', 'c1', undefined, 2);
    const args = prisma.message.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ conversationId: 'c1' });
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(args.take).toBe(3);
    expect(result.items.map(m => m.id)).toEqual(['m2', 'm3']);
    expect(result.hasMore).toBe(true);
    expect(result.items[0].createdAt).toBe('2026-10-03T10:02:00.000Z');
  });
  it('hasMore is false when the page is not full', async () => {
    const { service, prisma } = make();
    prisma.message.findMany.mockResolvedValue([msg('m1', T)]);
    expect(await service.messages('s1', 'c1', undefined, 2)).toMatchObject({ hasMore: false, items: [{ id: 'm1' }] });
  });
  it('cursors on the (createdAt, id) pair so equal timestamps are not skipped', async () => {
    const { service, prisma } = make();
    prisma.message.findFirst.mockResolvedValue(msg('m5', T));
    await service.messages('s1', 'c1', 'm5');
    expect(prisma.message.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'm5', conversationId: 'c1' } }));
    expect(prisma.message.findMany.mock.calls[0][0].where).toEqual({
      conversationId: 'c1',
      OR: [{ createdAt: { lt: new Date(T) } }, { createdAt: new Date(T), id: { lt: 'm5' } }],
    });
  });
  it('rejects a before cursor outside the conversation with 400', async () => {
    const { service, prisma } = make();
    prisma.message.findFirst.mockResolvedValue(null);
    await expect(service.messages('s1', 'c1', 'foreign')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.message.findMany).not.toHaveBeenCalled();
  });
  it('clamps limit: default 50, max 100, invalid falls back to 50', async () => {
    const { service, prisma } = make();
    const take = () => prisma.message.findMany.mock.calls.at(-1)[0].take;
    await service.messages('s1', 'c1'); expect(take()).toBe(51);
    await service.messages('s1', 'c1', undefined, 5000); expect(take()).toBe(101);
    await service.messages('s1', 'c1', undefined, 0); expect(take()).toBe(51);
    await service.messages('s1', 'c1', undefined, -3); expect(take()).toBe(51);
    await service.messages('s1', 'c1', undefined, NaN); expect(take()).toBe(51);
    await service.messages('s1', 'c1', undefined, 'abc' as any); expect(take()).toBe(51);
    await service.messages('s1', 'c1', undefined, '7' as any); expect(take()).toBe(8);
  });
  it('throws 404 for a non-participant before reading messages', async () => {
    const { service, prisma } = setup({ x1: u('x1', 'STUDENT') }, { findUnique: jest.fn().mockResolvedValue(conv()) });
    await expect(service.messages('x1', 'c1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.message.findMany).not.toHaveBeenCalled();
    expect(prisma.message.findFirst).not.toHaveBeenCalled();
  });
});

describe('ChatService.markRead', () => {
  const users = { s1: u('s1', 'STUDENT') };
  const make = () => setup(users, { findUnique: jest.fn().mockResolvedValue(conv()) });

  it('marks only the other side unread messages and emits read and unread', async () => {
    const { service, prisma, gateway } = make();
    prisma.message.updateMany.mockResolvedValue({ count: 3 });
    prisma.message.count.mockResolvedValue(0);
    expect(await service.markRead('s1', 'c1')).toEqual({ updated: 3 });
    const args = prisma.message.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({ conversationId: 'c1', senderId: { not: 's1' }, readAt: null });
    const readAt: Date = args.data.readAt;
    expect(readAt).toBeInstanceOf(Date);
    expect(gateway.emitToUser.mock.calls).toEqual([
      ['t1', 'chat:read', { conversationId: 'c1', readerId: 's1', readAt: readAt.toISOString() }],
      ['s1', 'chat:unread', { total: 0 }],
    ]);
  });
  it('emits nothing when nothing was updated', async () => {
    const { service, gateway } = make();
    expect(await service.markRead('s1', 'c1')).toEqual({ updated: 0 });
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });
  it('throws 404 for a non-participant and updates nothing', async () => {
    const { service, prisma } = setup({ x1: u('x1', 'STUDENT') }, { findUnique: jest.fn().mockResolvedValue(conv()) });
    await expect(service.markRead('x1', 'c1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.message.updateMany).not.toHaveBeenCalled();
  });
});

describe('ChatService.unreadTotal', () => {
  it('counts the other side unread messages across the user conversations', async () => {
    const { service, prisma } = setup({ s1: u('s1', 'STUDENT') });
    prisma.message.count.mockResolvedValue(7);
    expect(await service.unreadTotal('s1')).toEqual({ total: 7 });
    expect(prisma.message.count).toHaveBeenCalledWith({
      where: { senderId: { not: 's1' }, readAt: null, conversation: { OR: [{ studentId: 's1' }, { teacherId: 's1' }] } },
    });
  });
  it('rejects non chat roles', async () => {
    const { service } = setup({ a1: u('a1', 'ADMIN') });
    await expect(service.unreadTotal('a1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
