import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Difficulty } from '../../common/types/database.enums';
import { AdaptiveService } from '../adaptive/adaptive.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Injectable()
export class AttemptsService {
  constructor(private prisma: PrismaService, private adaptive: AdaptiveService) {}
  private attemptInclude = { test: { include: { topic: true, questions: { include: { options: true } } } }, answers: true } as const;
  async submit(userId: string, attemptId: string, dto: SubmitAttemptDto) {
    const attempt = await this.prisma.testAttempt.findUnique({ where: { id: attemptId }, include: this.attemptInclude });
    if (!attempt) throw new NotFoundException('Urinish topilmadi');
    if (attempt.userId !== userId) throw new ForbiddenException('Bu urinish sizga tegishli emas');
    if (attempt.finishedAt) throw new ConflictException('Bu test allaqachon yakunlangan');
    if (attempt.test.durationMinutes && Date.now() > attempt.startedAt.getTime() + attempt.test.durationMinutes * 60_000) throw new BadRequestException('Test uchun ajratilgan vaqt tugagan');
    const questionMap = new Map(attempt.test.questions.map(q => [q.id, q]));
    const received = new Map<string, string | undefined>();
    for (const answer of dto.answers) {
      if (!questionMap.has(answer.questionId) || received.has(answer.questionId)) throw new BadRequestException('Yuborilgan savol ma’lumotlari noto‘g‘ri');
      const question = questionMap.get(answer.questionId)!;
      if (answer.selectedOptionId && !question.options.some(o => o.id === answer.selectedOptionId)) throw new BadRequestException('Javob varianti savolga tegishli emas');
      received.set(answer.questionId, answer.selectedOptionId);
    }
    const evaluated = attempt.test.questions.map(question => {
      const selectedOptionId = received.get(question.id);
      const selected = question.options.find(o => o.id === selectedOptionId);
      const isCorrect = selected?.isCorrect === true;
      return { attemptId: attempt.id, questionId: question.id, selectedOptionId: selectedOptionId ?? null, isCorrect, points: isCorrect ? question.points : 0 };
    });
    const score = evaluated.reduce((sum, answer) => sum + answer.points, 0);
    const totalPoints = attempt.test.questions.reduce((sum, question) => sum + question.points, 0);
    const percentage = totalPoints ? Number(((score / totalPoints) * 100).toFixed(2)) : 0;
    const correctAnswers = evaluated.filter(a => a.isCorrect).length;
    const recommendedDifficulty = this.adaptive.getNextDifficulty(attempt.difficulty as Difficulty, percentage);
    await this.prisma.$transaction(async tx => {
      await tx.attemptAnswer.createMany({ data: evaluated });
      await tx.testAttempt.update({ where: { id: attempt.id }, data: { correctAnswers, wrongAnswers: attempt.totalQuestions - correctAnswers, score, percentage, recommendedDifficulty, finishedAt: new Date() } });
      const old = await tx.userTopicProgress.findUnique({ where: { userId_topicId: { userId, topicId: attempt.test.topicId } } });
      const totalAttempts = (old?.totalAttempts ?? 0) + 1;
      const averagePercentage = Number((((old?.averagePercentage ?? 0) * (old?.totalAttempts ?? 0) + percentage) / totalAttempts).toFixed(2));
      await tx.userTopicProgress.upsert({ where: { userId_topicId: { userId, topicId: attempt.test.topicId } }, create: { userId, topicId: attempt.test.topicId, difficulty: recommendedDifficulty, totalAttempts, averagePercentage, bestPercentage: percentage, lastPercentage: percentage }, update: { difficulty: recommendedDifficulty, totalAttempts, averagePercentage, bestPercentage: Math.max(old?.bestPercentage ?? 0, percentage), lastPercentage: percentage } });
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
