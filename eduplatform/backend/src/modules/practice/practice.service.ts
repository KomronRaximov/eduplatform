import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Difficulty } from '../../common/types/database.enums';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitAttemptDto } from '../attempts/dto/submit-attempt.dto';
import { evaluateAnswers } from '../attempts/evaluate-answers';
import { pickQuestions } from './practice.selection';
import { QuestionStatsService } from './question-stats.service';

export type PracticeQuestion = { id: string; text: string; order: number; points: number; options: { id: string; text: string; order: number }[] };

const WEAK_TOPIC_BELOW = 50;
const LEVELS: string[] = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];
const questionSelect = { id: true, text: true, order: true, points: true, options: { orderBy: { order: 'asc' as const }, select: { id: true, text: true, order: true, isCorrect: true } } };
const toPublic = (q: { id: string; text: string; order: number; points: number; options: { id: string; text: string; order: number }[] }): PracticeQuestion => ({ id: q.id, text: q.text, order: q.order, points: q.points, options: q.options.map(o => ({ id: o.id, text: o.text, order: o.order })) });
const shuffle = <T>(items: T[]): T[] => { const copy = [...items]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };

@Injectable()
export class PracticeService {
  constructor(private prisma: PrismaService, private stats: QuestionStatsService) {}

  private async loadPools(userId: string, now: Date, currentDifficulty: string) {
    const [questions, progress] = await Promise.all([
      this.prisma.question.findMany({ where: { test: { isActive: true, topic: { isActive: true } } }, select: { ...questionSelect, test: { select: { topicId: true, difficulty: true } }, stats: { where: { userId }, select: { box: true, nextReviewAt: true } } } }),
      this.prisma.userTopicProgress.findMany({ where: { userId }, include: { topic: true } }),
    ]);
    const weakTopics = new Set(progress.filter(p => p.averagePercentage < WEAK_TOPIC_BELOW).map(p => p.topicId));
    const level = LEVELS.indexOf(currentDifficulty);
    const rank = (q: (typeof questions)[number]) => (weakTopics.has(q.test.topicId) ? 0 : 1000) + Math.abs(LEVELS.indexOf(q.test.difficulty) - level);
    const due = questions.filter(q => q.stats[0] && q.stats[0].nextReviewAt <= now).sort((a, b) => a.stats[0].nextReviewAt.getTime() - b.stats[0].nextReviewAt.getTime());
    const fresh = questions.filter(q => !q.stats[0]).sort((a, b) => rank(a) - rank(b));
    const filler = questions.filter(q => q.stats[0] && q.stats[0].nextReviewAt > now && q.stats[0].box <= 1);
    return { due, fresh, filler, progress };
  }

  async start(userId: string, now = new Date()): Promise<{ attemptId: string | null; questions: PracticeQuestion[] }> {
    const open = await this.prisma.testAttempt.findFirst({ where: { userId, isPractice: true, finishedAt: null }, orderBy: { startedAt: 'desc' }, include: { practiceQuestions: { orderBy: { order: 'asc' }, include: { question: { select: questionSelect } } } } });
    if (open?.practiceQuestions.length) return { attemptId: open.id, questions: open.practiceQuestions.map(entry => toPublic(entry.question)) };
    if (open) await this.prisma.testAttempt.delete({ where: { id: open.id } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { currentDifficulty: true } });
    const { due, fresh, filler } = await this.loadPools(userId, now, user.currentDifficulty);
    const picked = shuffle(pickQuestions({ due, fresh, filler }));
    if (!picked.length) return { attemptId: null, questions: [] };
    const attempt = await this.prisma.testAttempt.create({ data: { userId, isPractice: true, difficulty: user.currentDifficulty, recommendedDifficulty: user.currentDifficulty, totalQuestions: picked.length, practiceQuestions: { create: picked.map((q, index) => ({ questionId: q.id, order: index + 1 })) } } });
    return { attemptId: attempt.id, questions: picked.map(toPublic) };
  }

  async submit(userId: string, attemptId: string, dto: SubmitAttemptDto, now = new Date()) {
    const attempt = await this.prisma.testAttempt.findUnique({ where: { id: attemptId }, include: { practiceQuestions: { orderBy: { order: 'asc' }, include: { question: { select: questionSelect } } } } });
    if (!attempt || !attempt.isPractice) throw new NotFoundException('Mashq sessiyasi topilmadi');
    if (attempt.userId !== userId) throw new ForbiddenException('Bu sessiya sizga tegishli emas');
    if (attempt.finishedAt) throw new ConflictException('Bu sessiya allaqachon yakunlangan');
    const evaluation = evaluateAnswers(attempt.practiceQuestions.map(entry => entry.question), dto.answers);
    const reviews = await this.prisma.$transaction(async tx => {
      const closed = await tx.testAttempt.updateMany({ where: { id: attemptId, finishedAt: null }, data: { correctAnswers: evaluation.correctCount, wrongAnswers: evaluation.rows.length - evaluation.correctCount, score: evaluation.score, percentage: evaluation.percentage, recommendedDifficulty: attempt.difficulty, finishedAt: now } });      if (!closed.count) throw new ConflictException('Bu sessiya allaqachon yakunlangan');      await tx.attemptAnswer.createMany({ data: evaluation.rows.map(row => ({ attemptId, ...row })) });
      if (!closed.count) throw new ConflictException('Bu sessiya allaqachon yakunlangan');
      await tx.attemptAnswer.createMany({ data: evaluation.rows.map(row => ({ attemptId, ...row })) });
      return this.stats.record(tx, userId, evaluation.rows.map(({ questionId, isCorrect }) => ({ questionId, isCorrect })), now);
    });
    return {
      attemptId, totalQuestions: evaluation.rows.length, correctAnswers: evaluation.correctCount, wrongAnswers: evaluation.rows.length - evaluation.correctCount, score: evaluation.score, percentage: evaluation.percentage,
      results: evaluation.rows.map(row => ({ questionId: row.questionId, isCorrect: row.isCorrect, nextReviewAt: reviews.get(row.questionId)!.toISOString() })),
    };
  }

  async overview(userId: string, now = new Date()) {
    const { due, fresh, progress } = await this.loadPools(userId, now, Difficulty.EASY);
    const weakTopics = progress.filter(p => p.averagePercentage < WEAK_TOPIC_BELOW).sort((a, b) => a.averagePercentage - b.averagePercentage).slice(0, 3).map(p => ({ topicId: p.topicId, name: p.topic.name, averagePercentage: p.averagePercentage }));
    return { dueCount: due.length, newCount: fresh.length, weakTopics };
  }
}
