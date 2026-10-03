import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nextBox, nextReviewAt } from './practice.scheduler';

@Injectable()
export class QuestionStatsService {
  async record(tx: Prisma.TransactionClient, userId: string, results: { questionId: string; isCorrect: boolean }[], now = new Date()): Promise<Map<string, Date>> {
    const reviews = new Map<string, Date>();
    if (!results.length) return reviews;
    const existing = await tx.userQuestionStat.findMany({ where: { userId, questionId: { in: results.map(r => r.questionId) } } });
    const byQuestion = new Map(existing.map(stat => [stat.questionId, stat]));
    for (const { questionId, isCorrect } of results) {
      const old = byQuestion.get(questionId);
      const box = nextBox(old?.box ?? null, isCorrect);
      const reviewAt = nextReviewAt(box, now);
      const correctCount = (old?.correctCount ?? 0) + (isCorrect ? 1 : 0);
      const wrongCount = (old?.wrongCount ?? 0) + (isCorrect ? 0 : 1);
      await tx.userQuestionStat.upsert({
        where: { userId_questionId: { userId, questionId } },
        create: { userId, questionId, box, correctCount, wrongCount, lastSeenAt: now, nextReviewAt: reviewAt },
        update: { box, correctCount, wrongCount, lastSeenAt: now, nextReviewAt: reviewAt },
      });
      reviews.set(questionId, reviewAt);
    }
    return reviews;
  }
}
