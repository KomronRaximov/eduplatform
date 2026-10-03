import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';

const u = (id: string, role: string, over: any = {}) => ({ id, role, firstName: `F${id}`, lastName: `L${id}`, email: `${id}@x.uz`, ...over });
const conv = (over: any = {}) => ({ id: 'c1', studentId: 's1', teacherId: 't1', student: u('s1', 'STUDENT'), teacher: u('t1', 'TEACHER'), messages: [], _count: { messages: 0 }, lastMessageAt: new Date('2026-10-01T00:00:00Z'), ...over });

function setup(users: Record<string, any> = {}, over: any = {}) {
  const prisma: any = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => users[where.id] ?? null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    conversation: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(async ({ data }: any) => conv({ id: 'new', ...data })),
      ...over,
    },
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
