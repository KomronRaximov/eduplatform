import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Difficulty } from '../../common/types/database.enums';
import { AdaptiveService } from '../adaptive/adaptive.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QuestionStatsService } from '../practice/question-stats.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { evaluateAnswers } from './evaluate-answers';

@Injectable()
export class AttemptsService {
  constructor(private prisma: PrismaService, private adaptive: AdaptiveService, private stats: QuestionStatsService) {}
  private attemptInclude = { test: { include: { topic: true, questions: { include: { options: true } } } }, answers: true } as const;
  async submit(userId: string, attemptId: string, dto: SubmitAttemptDto) {
    const attempt = await this.prisma.testAttempt.findUnique({ where: { id: attemptId }, include: this.attemptInclude });
    if (!attempt) throw new NotFoundException('Urinish topilmadi');
    if (attempt.userId !== userId) throw new ForbiddenException('Bu urinish sizga tegishli emas');
    if (attempt.finishedAt) throw new ConflictException('Bu test allaqachon yakunlangan');
    const test = attempt.test;
    if (attempt.isPractice || !test) throw new ConflictException('Bu urinish mashq sessiyasiga tegishli');
    if (test.durationMinutes && Date.now() > attempt.startedAt.getTime() + test.durationMinutes * 60_000) throw new BadRequestException('Test uchun ajratilgan vaqt tugagan');
    const { rows, score, percentage, correctCount: correctAnswers } = evaluateAnswers(test.questions, dto.answers);
    const evaluated = rows.map(row => ({ attemptId: attempt.id, ...row }));
    const recommendedDifficulty = this.adaptive.getNextDifficulty(attempt.difficulty as Difficulty, percentage);
    await this.prisma.$transaction(async tx => {
      await tx.attemptAnswer.createMany({ data: evaluated });
      await this.stats.record(tx, userId, rows.map(({ questionId, isCorrect }) => ({ questionId, isCorrect })));
      await tx.testAttempt.update({ where: { id: attempt.id }, data: { correctAnswers, wrongAnswers: attempt.totalQuestions - correctAnswers, score, percentage, recommendedDifficulty, finishedAt: new Date() } });
      const old = await tx.userTopicProgress.findUnique({ where: { userId_topicId: { userId, topicId: test.topicId } } });
      const totalAttempts = (old?.totalAttempts ?? 0) + 1;
      const averagePercentage = Number((((old?.averagePercentage ?? 0) * (old?.totalAttempts ?? 0) + percentage) / totalAttempts).toFixed(2));
      await tx.userTopicProgress.upsert({ where: { userId_topicId: { userId, topicId: test.topicId } }, create: { userId, topicId: test.topicId, difficulty: recommendedDifficulty, totalAttempts, averagePercentage, bestPercentage: percentage, lastPercentage: percentage }, update: { difficulty: recommendedDifficulty, totalAttempts, averagePercentage, bestPercentage: Math.max(old?.bestPercentage ?? 0, percentage), lastPercentage: percentage } });
      const allProgress = await tx.userTopicProgress.findMany({ where: { userId } });
      const order: Difficulty[] = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];
      const averageLevel = allProgress.reduce((sum, p) => sum + order.indexOf(p.difficulty as Difficulty), 0) / allProgress.length;
      await tx.user.update({ where: { id: userId }, data: { currentDifficulty: order[Math.round(averageLevel)] } });
    });
    return { attemptId, totalQuestions: attempt.totalQuestions, correctAnswers, wrongAnswers: attempt.totalQuestions - correctAnswers, score, percentage, currentDifficulty: attempt.difficulty, recommendedDifficulty, recommendation: this.adaptive.recommendation(recommendedDifficulty, percentage) };
  }
  async history(userId: string, topicId?: string, difficulty?: Difficulty) {
    return this.prisma.testAttempt.findMany({ where: { userId, finishedAt: { not: null }, ...(difficulty && { difficulty }), ...(topicId && { test: { topicId } }) }, include: { test: { include: { topic: true } } }, orderBy: { finishedAt: 'desc' } });
  }
  async get(userId: string, id: string) {
    const attempt = await this.prisma.testAttempt.findUnique({ where: { id }, include: { test: { include: { topic: true } } } });
    if (!attempt) throw new NotFoundException('Urinish topilmadi'); if (attempt.userId !== userId) throw new ForbiddenException(); return attempt;
  }
}
