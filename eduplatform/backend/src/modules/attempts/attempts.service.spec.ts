import { ConflictException } from '@nestjs/common';
import { AdaptiveService } from '../adaptive/adaptive.service';
import { AttemptsService } from './attempts.service';

const question = { id: 'q1', points: 1, options: [{ id: 'o1', isCorrect: true }, { id: 'o2', isCorrect: false }] };
const baseAttempt = { id: 'a1', userId: 'u1', testId: 't1', isPractice: false, finishedAt: null, startedAt: new Date(), difficulty: 'EASY', totalQuestions: 1, test: { topicId: 'topic1', durationMinutes: null, questions: [question] }, answers: [] };

function setup(attempt: any) {
  const tx: any = {
    attemptAnswer: { createMany: jest.fn() }, testAttempt: { update: jest.fn() }, user: { update: jest.fn() },
    userTopicProgress: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([{ difficulty: 'MEDIUM' }]) },
  };
  const prisma: any = { testAttempt: { findUnique: jest.fn().mockResolvedValue(attempt) }, $transaction: jest.fn(async (fn: any) => fn(tx)) };
  const stats = { record: jest.fn().mockResolvedValue(new Map()) };
  return { service: new AttemptsService(prisma, new AdaptiveService(), stats as any), stats, tx };
}

describe('AttemptsService.submit', () => {
  it('rejects practice attempts', async () => {
    const { service } = setup({ ...baseAttempt, isPractice: true, testId: null, test: null });
    await expect(service.submit('u1', 'a1', { answers: [] })).rejects.toThrow(ConflictException);
  });
  it('records question stats and keeps the result shape', async () => {
    const { service, stats, tx } = setup(baseAttempt);
    const result = await service.submit('u1', 'a1', { answers: [{ questionId: 'q1', selectedOptionId: 'o1' }] });
    expect(stats.record).toHaveBeenCalledWith(tx, 'u1', [{ questionId: 'q1', isCorrect: true }]);
    expect(result).toMatchObject({ attemptId: 'a1', percentage: 100, correctAnswers: 1, wrongAnswers: 0, recommendedDifficulty: 'MEDIUM' });
  });
});
