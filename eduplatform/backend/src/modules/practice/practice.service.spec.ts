import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PracticeService } from './practice.service';

const now = new Date('2026-10-03T10:00:00Z');
const day = 86_400_000;
const makeQuestion = (id: string, over: any = {}) => ({ id, text: `Savol ${id}`, order: 1, points: 1, options: [{ id: `${id}-a`, text: 'A', order: 1, isCorrect: true }, { id: `${id}-b`, text: 'B', order: 2, isCorrect: false }], test: { topicId: 't1', difficulty: 'EASY' }, stats: [], ...over });
const stat = (box: number, nextReviewAt: Date) => [{ box, nextReviewAt }];

function setup(opts: { questions?: any[]; open?: any; attempt?: any; progress?: any[] } = {}) {
  const tx: any = { attemptAnswer: { createMany: jest.fn() }, testAttempt: { update: jest.fn() }, userTopicProgress: { upsert: jest.fn() }, user: { update: jest.fn() } };
  tx.testAttempt.updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const prisma: any = {
    testAttempt: { findFirst: jest.fn().mockResolvedValue(opts.open ?? null), findUnique: jest.fn().mockResolvedValue(opts.attempt ?? null), create: jest.fn().mockResolvedValue({ id: 'new-attempt' }) },
    user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ currentDifficulty: 'EASY' }), update: tx.user.update },
    question: { findMany: jest.fn().mockResolvedValue(opts.questions ?? []) },
    userTopicProgress: { findMany: jest.fn().mockResolvedValue(opts.progress ?? []), upsert: tx.userTopicProgress.upsert },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const stats = { record: jest.fn().mockImplementation(async (_tx: any, _u: string, results: any[]) => new Map(results.map(r => [r.questionId, new Date(now.getTime() + day)]))) };
  return { service: new PracticeService(prisma, stats as any), prisma, stats, tx };
}

describe('PracticeService.start', () => {
  it('builds a 12 question session from unseen questions', async () => {
    const { service, prisma } = setup({ questions: Array.from({ length: 20 }, (_, i) => makeQuestion(`q${i}`)) });
    const result = await service.start('u1', now);
    expect(result.attemptId).toBe('new-attempt');
    expect(result.questions).toHaveLength(12);
    expect(result.questions[0].options[0]).not.toHaveProperty('isCorrect');
    expect(prisma.testAttempt.create).toHaveBeenCalledTimes(1);
  });
  it('returns the open session instead of creating another', async () => {
    const open = { id: 'open1', practiceQuestions: [{ order: 1, question: makeQuestion('q1') }] };
    const { service, prisma } = setup({ open });
    const result = await service.start('u1', now);
    expect(result).toMatchObject({ attemptId: 'open1' });
    expect(result.questions.map(q => q.id)).toEqual(['q1']);
    expect(prisma.testAttempt.create).not.toHaveBeenCalled();
  });
  it('returns an empty session without creating an attempt when nothing qualifies', async () => {
    const { service, prisma } = setup({ questions: [makeQuestion('far', { stats: stat(3, new Date(now.getTime() + 5 * day)) })] });
    expect(await service.start('u1', now)).toEqual({ attemptId: null, questions: [] });
    expect(prisma.testAttempt.create).not.toHaveBeenCalled();
  });
  it('includes due questions and skips not-yet-due high-box ones', async () => {
    const questions = [makeQuestion('due', { stats: stat(0, new Date(now.getTime() - 1000)) }), makeQuestion('later', { stats: stat(3, new Date(now.getTime() + day)) }), makeQuestion('new')];
    const { service } = setup({ questions });
    const ids = (await service.start('u1', now)).questions.map(q => q.id).sort();
    expect(ids).toEqual(['due', 'new']);
  });
});

describe('PracticeService.submit', () => {
  const attempt = (over: any = {}) => ({ id: 'a1', userId: 'u1', isPractice: true, finishedAt: null, difficulty: 'EASY', practiceQuestions: [{ question: makeQuestion('q1') }, { question: makeQuestion('q2') }], ...over });
  it('grades, records stats and leaves topic progress untouched', async () => {
    const { service, stats, tx } = setup({ attempt: attempt() });
    const result = await service.submit('u1', 'a1', { answers: [{ questionId: 'q1', selectedOptionId: 'q1-a' }, { questionId: 'q2', selectedOptionId: 'q2-a' }] }, now);
    expect(result).toMatchObject({ attemptId: 'a1', percentage: 100, correctAnswers: 2, wrongAnswers: 0 });
    expect(result.results[0]).toMatchObject({ questionId: 'q1', isCorrect: true, nextReviewAt: new Date(now.getTime() + day).toISOString() });
    expect(stats.record).toHaveBeenCalledTimes(1);
    expect(tx.userTopicProgress.upsert).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('treats an empty submission as all wrong', async () => {
    const { service, stats } = setup({ attempt: attempt() });
    const result = await service.submit('u1', 'a1', { answers: [] }, now);
    expect(result).toMatchObject({ correctAnswers: 0, wrongAnswers: 2, percentage: 0 });
    expect(stats.record.mock.calls[0][2].every((r: any) => r.isCorrect === false)).toBe(true);
  });
  it('rejects a second submission', async () => {
    const { service } = setup({ attempt: attempt({ finishedAt: now }) });
    await expect(service.submit('u1', 'a1', { answers: [] }, now)).rejects.toThrow(ConflictException);
  });
  it('rejects other users, missing and non-practice attempts', async () => {
    await expect(setup({ attempt: attempt({ userId: 'other' }) }).service.submit('u1', 'a1', { answers: [] }, now)).rejects.toThrow(ForbiddenException);
    await expect(setup({}).service.submit('u1', 'a1', { answers: [] }, now)).rejects.toThrow(NotFoundException);
    await expect(setup({ attempt: attempt({ isPractice: false }) }).service.submit('u1', 'a1', { answers: [] }, now)).rejects.toThrow(NotFoundException);
  });
  it('rejects questions that are not part of the session', async () => {
    const { service } = setup({ attempt: attempt() });
    await expect(service.submit('u1', 'a1', { answers: [{ questionId: 'other' }] }, now)).rejects.toThrow(BadRequestException);
  });
});

describe('PracticeService.overview', () => {
  it('counts due and new questions and lists the weakest topics', async () => {
    const questions = [makeQuestion('due', { stats: stat(0, new Date(now.getTime() - 1)) }), makeQuestion('later', { stats: stat(2, new Date(now.getTime() + day)) }), makeQuestion('n1'), makeQuestion('n2')];
    const progress = [1, 2, 3, 4].map(i => ({ topicId: `t${i}`, averagePercentage: i * 10, topic: { name: `T${i}` } }));
    const { service } = setup({ questions, progress });
    const result = await service.overview('u1', now);
    expect(result).toMatchObject({ dueCount: 1, newCount: 2 });
    expect(result.weakTopics.map(t => t.name)).toEqual(['T1', 'T2', 'T3']);
  });
});

describe('PracticeService concurrency and stale sessions', () => {
  it('replaces an open session whose questions were all deleted', async () => {
    const open = { id: 'stale', practiceQuestions: [] };
    const { service, prisma } = setup({ open, questions: [makeQuestion('q1')] });
    prisma.testAttempt.delete = jest.fn();
    const result = await service.start('u1', now);
    expect(prisma.testAttempt.delete).toHaveBeenCalledWith({ where: { id: 'stale' } });
    expect(result).toMatchObject({ attemptId: 'new-attempt' });
  });
  it('looks for the newest open session', async () => {
    const { service, prisma } = setup({});
    await service.start('u1', now);
    expect(prisma.testAttempt.findFirst.mock.calls[0][0].orderBy).toEqual({ startedAt: 'desc' });
  });
  it('returns 409 when a concurrent submit already finished the attempt', async () => {
    const attempt = { id: 'a1', userId: 'u1', isPractice: true, finishedAt: null, difficulty: 'EASY', practiceQuestions: [{ question: makeQuestion('q1') }] };
    const { service, tx } = setup({ attempt });
    tx.testAttempt.updateMany = jest.fn().mockResolvedValue({ count: 0 });
    await expect(service.submit('u1', 'a1', { answers: [] }, now)).rejects.toThrow(ConflictException);
  });
});

describe('PracticeService.submit writes answers once', () => {
  it('inserts the attempt answers exactly once, one row per session question', async () => {
    const attempt = { id: 'a1', userId: 'u1', isPractice: true, finishedAt: null, difficulty: 'EASY', practiceQuestions: [{ question: makeQuestion('q1') }, { question: makeQuestion('q2') }] };
    const { service, tx } = setup({ attempt });
    await service.submit('u1', 'a1', { answers: [] }, now);
    expect(tx.attemptAnswer.createMany).toHaveBeenCalledTimes(1);
    expect(tx.attemptAnswer.createMany.mock.calls[0][0].data).toHaveLength(2);
  });
});
