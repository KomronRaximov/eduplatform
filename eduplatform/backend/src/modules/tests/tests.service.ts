import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Difficulty } from '../../common/types/database.enums';
import { PrismaService } from '../../prisma/prisma.service';
import { TestFilterDto } from './dto/test.dto';

const publicTestInclude = { topic: true, _count: { select: { questions: true } } } satisfies Prisma.TestInclude;
const attemptTestInclude = { questions: { orderBy: { order: 'asc' as const }, select: { id: true, text: true, order: true, points: true, options: { orderBy: { order: 'asc' as const }, select: { id: true, text: true, order: true } } } } } satisfies Prisma.TestInclude;
@Injectable()
export class TestsService {
  constructor(private prisma: PrismaService) {}
  list(filters: TestFilterDto) {
    return this.prisma.test.findMany({ where: { isActive: true, ...(filters.topicId && { topicId: filters.topicId }), ...(filters.difficulty && { difficulty: filters.difficulty }) }, include: publicTestInclude, orderBy: [{ topic: { name: 'asc' } }, { difficulty: 'asc' }] });
  }
  async get(id: string) { const test = await this.prisma.test.findFirst({ where: { id, isActive: true }, include: { ...publicTestInclude, questions: { orderBy: { order: 'asc' }, select: { id: true, text: true, order: true, points: true, options: { orderBy: { order: 'asc' }, select: { id: true, text: true, order: true } } } } } }); if (!test) throw new NotFoundException('Test topilmadi'); return test; }
  async start(userId: string, testId: string) {
    const test = await this.prisma.test.findFirst({ where: { id: testId, isActive: true }, include: attemptTestInclude });
    if (!test) throw new NotFoundException('Faol test topilmadi');
    if (!test.questions.length) throw new ForbiddenException('Bu testda savollar mavjud emas');
    const attempt = await this.prisma.testAttempt.create({ data: { userId, testId, difficulty: test.difficulty, totalQuestions: test.questions.length, recommendedDifficulty: test.difficulty } });
    return { attemptId: attempt.id, test: { id: test.id, title: test.title, difficulty: test.difficulty, durationMinutes: test.durationMinutes }, questions: test.questions };
  }
  async recommended(userId: string) {
    const topics = await this.prisma.topic.findMany({ where: { isActive: true }, include: { progress: { where: { userId } } } });
    const progressByTopic = new Map(topics.map(t => [t.id, t.progress[0]?.difficulty ?? Difficulty.EASY]));
    const attempted = await this.prisma.testAttempt.groupBy({ by: ['testId'], where: { userId }, _count: true });
    const counts = new Map(attempted.map(a => [a.testId, a._count]));
    const candidates = await this.prisma.test.findMany({ where: { isActive: true, OR: [...progressByTopic].map(([topicId, difficulty]) => ({ topicId, difficulty })) }, include: publicTestInclude });
    return candidates.sort((a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0)).slice(0, 6);
  }
}
