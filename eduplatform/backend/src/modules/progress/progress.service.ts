import { Injectable } from '@nestjs/common'; import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class ProgressService {
 constructor(private prisma: PrismaService) {}
 private classification(value: number) { return value >= 80 ? 'STRONG' : value >= 50 ? 'NORMAL' : 'WEAK'; }
 async summary(userId: string) {
  const attempts = await this.prisma.testAttempt.findMany({ where: { userId, finishedAt: { not: null } }, select: { percentage: true } });
  return { totalAttempts: attempts.length, averagePercentage: attempts.length ? Number((attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length).toFixed(1)) : 0, bestPercentage: attempts.length ? Math.max(...attempts.map(a => a.percentage)) : 0 };
 }
 async history(userId: string) { const rows = await this.prisma.testAttempt.findMany({ where: { userId, finishedAt: { not: null } }, select: { finishedAt: true, percentage: true, test: { select: { title: true } } }, orderBy: { finishedAt: 'asc' } }); return rows.map(a => ({ date: a.finishedAt?.toISOString().slice(0, 10), test: a.test.title, percentage: a.percentage })); }
 async topics(userId: string) { const rows = await this.prisma.userTopicProgress.findMany({ where: { userId }, include: { topic: true }, orderBy: { averagePercentage: 'desc' } }); return rows.map(p => ({ ...p, classification: this.classification(p.averagePercentage) })); }
 async get(userId: string) { const [summary, history, topics] = await Promise.all([this.summary(userId), this.history(userId), this.topics(userId)]); return { summary, history, topics, strongTopics: topics.filter(t => t.classification === 'STRONG'), weakTopics: topics.filter(t => t.classification === 'WEAK'), recommendation: topics.find(t => t.classification === 'WEAK') ? `${topics.find(t => t.classification === 'WEAK')!.topic.name} mavzusini qayta mustahkamlash tavsiya etiladi.` : 'Mashqlarni muntazam davom ettiring.' }; }
}
