import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}
  async get(userId: string) {
    const [user, attempts, topicProgress] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { firstName: true, lastName: true, currentDifficulty: true } }),
      this.prisma.testAttempt.findMany({ where: { userId, finishedAt: { not: null } }, include: { test: { include: { topic: true } } }, orderBy: { finishedAt: 'desc' } }),
      this.prisma.userTopicProgress.findMany({ where: { userId }, include: { topic: true }, orderBy: { averagePercentage: 'desc' } })
    ]);
    const summary = { totalTests: attempts.length, averagePercentage: attempts.length ? Number((attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length).toFixed(1)) : 0, bestPercentage: attempts.length ? Math.max(...attempts.map(a => a.percentage)) : 0 };
    const topicIds = new Set(topicProgress.map(p => p.topicId));
    const topics = await this.prisma.topic.findMany({ where: { isActive: true } });
    const expected = new Map(topicProgress.map(p => [p.topicId, p.difficulty]));
    for (const topic of topics) if (!topicIds.has(topic.id)) expected.set(topic.id, 'EASY');
    const candidates = await this.prisma.test.findMany({ where: { isActive: true, OR: [...expected].map(([topicId, difficulty]) => ({ topicId, difficulty: difficulty as any })) }, include: { topic: true, _count: { select: { questions: true } } }, take: 6 });
    return { user, summary, recentAttempts: attempts.slice(0, 5), recommendedTests: candidates, topicProgress };
  }
}
