import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../common/types/database.enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import { ChatContact, ChatConversationDto, ChatMessageDto, DEFAULT_PAGE, MAX_BODY, MAX_PAGE, RATE_LIMIT_PER_MINUTE } from './chat.types';

type ChatRole = 'STUDENT' | 'TEACHER';
type Actor = { id: string; role: ChatRole; firstName: string; lastName: string };
type ContactRow = { id: string; role: string; firstName: string; lastName: string; email: string };

const userSelect = { id: true, role: true, firstName: true, lastName: true, email: true };

const toContact = (user: ContactRow, viewerRole: ChatRole): ChatContact => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role as ChatRole,
  ...(viewerRole === UserRole.TEACHER ? { email: user.email } : {}),
});

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private prisma: PrismaService, private gateway: ChatGateway) {}

  private async actor(userId: string): Promise<Actor> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, firstName: true, lastName: true } });
    if (!user || (user.role !== UserRole.STUDENT && user.role !== UserRole.TEACHER)) throw new ForbiddenException('Chat faqat talaba va o‘qituvchilar uchun');
    return { id: user.id, role: user.role as ChatRole, firstName: user.firstName, lastName: user.lastName };
  }

  private conversationInclude(userId: string) {
    return {
      student: { select: userSelect },
      teacher: { select: userSelect },
      messages: { orderBy: { createdAt: 'desc' as const }, take: 1, select: { body: true, senderId: true, createdAt: true } },
      _count: { select: { messages: { where: { senderId: { not: userId }, readAt: null } } } },
    };
  }

  private toConversationDto(conversation: any, viewer: Actor): ChatConversationDto {
    const other: ContactRow = conversation.studentId === viewer.id ? conversation.teacher : conversation.student;
    const last = conversation.messages[0];
    return {
      id: conversation.id,
      other: toContact(other, viewer.role),
      lastMessage: last ? { body: last.body, senderId: last.senderId, createdAt: last.createdAt.toISOString() } : null,
      unreadCount: conversation._count.messages,
    };
  }

  async contacts(userId: string, q?: string, limit?: number): Promise<ChatContact[]> {
    const actor = await this.actor(userId);
    const targetRole = actor.role === UserRole.STUDENT ? UserRole.TEACHER : UserRole.STUDENT;
    const term = q?.trim();
    const take = Math.min(Math.max(Math.floor(limit ?? DEFAULT_PAGE) || DEFAULT_PAGE, 1), MAX_PAGE);
    const users = await this.prisma.user.findMany({
      where: {
        role: targetRole,
        ...(term ? { OR: [{ firstName: { contains: term } }, { lastName: { contains: term } }, { email: { contains: term } }] } : {}),
      },
      select: userSelect,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take,
    });
    return users.map(user => toContact(user, actor.role));
  }

  async conversations(userId: string): Promise<ChatConversationDto[]> {
    const actor = await this.actor(userId);
    const rows = await this.prisma.conversation.findMany({
      where: { OR: [{ studentId: userId }, { teacherId: userId }] },
      orderBy: { lastMessageAt: 'desc' },
      include: this.conversationInclude(userId),
    });
    return rows.map(row => this.toConversationDto(row, actor));
  }

  async openConversation(userId: string, otherId: string): Promise<ChatConversationDto> {
    const actor = await this.actor(userId);
    if (otherId === userId) throw new BadRequestException('O‘zingiz bilan suhbat ochib bo‘lmaydi');
    const other = await this.prisma.user.findUnique({ where: { id: otherId }, select: { id: true, role: true } });
    if (!other) throw new NotFoundException('Foydalanuvchi topilmadi');
    const expected = actor.role === UserRole.STUDENT ? UserRole.TEACHER : UserRole.STUDENT;
    if (other.role !== expected) throw new BadRequestException('Suhbat faqat talaba va o‘qituvchi o‘rtasida bo‘ladi');

    const where = { studentId_teacherId: actor.role === UserRole.STUDENT ? { studentId: userId, teacherId: otherId } : { studentId: otherId, teacherId: userId } };
    const include = this.conversationInclude(userId);
    let conversation = await this.prisma.conversation.findUnique({ where, include });
    if (!conversation) {
      try {
        conversation = await this.prisma.conversation.create({ data: { ...where.studentId_teacherId, lastMessageAt: new Date() }, include });
      } catch (error: any) {
        if (error?.code !== 'P2002') throw error;
        conversation = await this.prisma.conversation.findUnique({ where, include });
        if (!conversation) throw error;
      }
    }
    return this.toConversationDto(conversation, actor);
  }

  private toMessageDto(message: { id: string; conversationId: string; senderId: string; body: string; createdAt: Date; readAt: Date | null }): ChatMessageDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt ? message.readAt.toISOString() : null,
    };
  }

  private async emitSafely(emit: () => Promise<void>) {
    try {
      await emit();
    } catch (error: any) {
      this.logger.error(`Chat hodisasini yuborib bo‘lmadi: ${error?.message ?? error}`);
    }
  }

  async messages(userId: string, conversationId: string, before?: string, limit?: number): Promise<{ items: ChatMessageDto[]; hasMore: boolean }> {
    await this.actor(userId);
    await this.assertParticipant(userId, conversationId);
    const parsed = Math.floor(Number(limit));
    const take = Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, MAX_PAGE) : DEFAULT_PAGE;

    let cursorFilter = {};
    if (before) {
      const cursor = await this.prisma.message.findFirst({ where: { id: before, conversationId }, select: { id: true, createdAt: true } });
      if (!cursor) throw new BadRequestException('Noto‘g‘ri kursor');
      cursorFilter = { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] };
    }
    const rows = await this.prisma.message.findMany({
      where: { conversationId, ...cursorFilter },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });
    const hasMore = rows.length > take;
    return { items: rows.slice(0, take).reverse().map(row => this.toMessageDto(row)), hasMore };
  }

  async send(userId: string, conversationId: string, body: string): Promise<ChatMessageDto> {
    await this.actor(userId);
    const conversation = await this.assertParticipant(userId, conversationId);
    const pair = await this.prisma.user.findMany({ where: { id: { in: [conversation.studentId, conversation.teacherId] } }, select: { id: true, role: true } });
    const roleOf = (id: string) => pair.find(user => user.id === id)?.role;
    if (roleOf(conversation.studentId) !== UserRole.STUDENT || roleOf(conversation.teacherId) !== UserRole.TEACHER) {
      throw new ForbiddenException('Chat faqat talaba va o‘qituvchilar uchun');
    }
    const text = typeof body === 'string' ? body.trim() : '';
    if (!text) throw new BadRequestException('Xabar bo‘sh bo‘lmasligi kerak');
    if (text.length > MAX_BODY) throw new BadRequestException(`Xabar ${MAX_BODY} belgidan oshmasligi kerak`);

    const recent = await this.prisma.message.count({ where: { senderId: userId, createdAt: { gte: new Date(Date.now() - 60_000) } } });
    if (recent >= RATE_LIMIT_PER_MINUTE) throw new HttpException('Juda ko‘p xabar yuborildi, biroz kuting', HttpStatus.TOO_MANY_REQUESTS);

    const created = await this.prisma.$transaction(async tx => {
      const message = await tx.message.create({ data: { conversationId, senderId: userId, body: text } });
      await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } });
      return message;
    });
    const dto = this.toMessageDto(created);
    const receiverId = conversation.studentId === userId ? conversation.teacherId : conversation.studentId;
    await this.emitSafely(async () => {
      this.gateway.emitToUser(userId, 'chat:message', { message: dto });
      this.gateway.emitToUser(receiverId, 'chat:message', { message: dto });
      this.gateway.emitToUser(receiverId, 'chat:unread', await this.unreadTotal(receiverId));
    });
    return dto;
  }

  async markRead(userId: string, conversationId: string): Promise<{ updated: number }> {
    await this.actor(userId);
    const conversation = await this.assertParticipant(userId, conversationId);
    const readAt = new Date();
    const { count } = await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt },
    });
    if (count > 0) {
      const otherId = conversation.studentId === userId ? conversation.teacherId : conversation.studentId;
      await this.emitSafely(async () => {
        this.gateway.emitToUser(otherId, 'chat:read', { conversationId, readerId: userId, readAt: readAt.toISOString() });
        this.gateway.emitToUser(userId, 'chat:unread', await this.unreadTotal(userId));
      });
    }
    return { updated: count };
  }

  async unreadTotal(userId: string): Promise<{ total: number }> {
    await this.actor(userId);
    const total = await this.prisma.message.count({
      where: { senderId: { not: userId }, readAt: null, conversation: { OR: [{ studentId: userId }, { teacherId: userId }] } },
    });
    return { total };
  }

  private async assertParticipant(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || (conversation.studentId !== userId && conversation.teacherId !== userId)) throw new NotFoundException('Suhbat topilmadi');
    return conversation;
  }
}
