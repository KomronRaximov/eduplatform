import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../common/types/database.enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import { ChatContact, ChatConversationDto, DEFAULT_PAGE, MAX_PAGE } from './chat.types';

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

  private async assertParticipant(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || (conversation.studentId !== userId && conversation.teacherId !== userId)) throw new NotFoundException('Suhbat topilmadi');
    return conversation;
  }
}
