import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/types/database.enums';
import { ResultsController } from './results.controller';
import { buildResultWhere, PASS_PERCENTAGE, ResultsService } from './results.service';

const row = (over: Record<string, unknown> = {}) => ({
  id: 'a1', isPractice: false, difficulty: 'EASY', correctAnswers: 3, totalQuestions: 4, score: 3, percentage: 75, finishedAt: new Date(2026, 10, 12, 9, 5),
  user: { id: 'u1', firstName: 'Ali', lastName: 'Valiyev', email: 'ali@example.com' },
  test: { id: 't1', title: 'Algebra', topic: { id: 'tp1', name: 'Matematika' } },
  ...over,
});

describe('ResultsController roles', () => {
  it('allows ADMIN and TEACHER', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ResultsController)).toEqual(expect.arrayContaining([UserRole.ADMIN, UserRole.TEACHER]));
  });
  it('rejects STUDENT', () => {
    const guard = new RolesGuard(new Reflector());
    const ctx = { getHandler: () => ResultsController.prototype.list, getClass: () => ResultsController, switchToHttp: () => ({ getRequest: () => ({ user: { role: 'STUDENT' } }) }) } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(false);
  });
});

describe('buildResultWhere', () => {
  it('only returns finished attempts of students', () => {
    expect(buildResultWhere({})).toEqual({ finishedAt: { not: null }, user: { role: UserRole.STUDENT } });
  });
  it('applies search, test, topic, kind and status filters', () => {
    const where = buildResultWhere({ search: ' ali ', testId: 't1', topicId: 'tp1', kind: 'TEST', status: 'FAILED' });
    expect(where.user).toEqual({ role: UserRole.STUDENT, OR: [{ firstName: { contains: 'ali' } }, { lastName: { contains: 'ali' } }, { email: { contains: 'ali' } }] });
    expect(where).toMatchObject({ testId: 't1', test: { topicId: 'tp1' }, isPractice: false, percentage: { lt: PASS_PERCENTAGE } });
    expect(buildResultWhere({ status: 'PASSED', kind: 'PRACTICE' })).toMatchObject({ isPractice: true, percentage: { gte: PASS_PERCENTAGE } });
  });
});

describe('ResultsService', () => {
  it('list returns items, meta and summary', async () => {
    const prisma: any = { testAttempt: {
      count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(2),
      aggregate: jest.fn().mockResolvedValue({ _avg: { percentage: 61.666 } }),
      findMany: jest.fn().mockResolvedValue([row()]),
    } };
    const res = await new ResultsService(prisma).list({ page: 2, limit: 1 } as any);
    expect(res.summary).toEqual({ total: 3, passed: 2, failed: 1, averagePercentage: 61.7, passPercentage: PASS_PERCENTAGE });
    expect(res.meta).toEqual({ page: 2, limit: 1, total: 3, totalPages: 3 });
    expect(prisma.testAttempt.findMany.mock.calls[0][0]).toMatchObject({ skip: 1, take: 1, orderBy: { finishedAt: 'desc' } });
  });

  it('get throws 404 for missing or non-student attempts', async () => {
    const prisma: any = { testAttempt: { findFirst: jest.fn().mockResolvedValue(null) } };
    await expect(new ResultsService(prisma).get('x')).rejects.toThrow(NotFoundException);
  });

  it('get orders practice answers by session order', async () => {
    const q = (id: string, order: number) => ({ id, text: id, order, points: 1, options: [] });
    const attempt = { ...row({ isPractice: true, test: null }), answers: [
      { questionId: 'q1', points: 0, isCorrect: false, selectedOptionId: null, question: q('q1', 1) },
      { questionId: 'q2', points: 1, isCorrect: true, selectedOptionId: 'o', question: q('q2', 2) },
    ], practiceQuestions: [{ questionId: 'q1', order: 2 }, { questionId: 'q2', order: 1 }] };
    const prisma: any = { testAttempt: { findFirst: jest.fn().mockResolvedValue(attempt) } };
    const res = await new ResultsService(prisma).get('a1');
    expect(res.answers.map(a => a.questionId)).toEqual(['q2', 'q1']);
    expect(res).not.toHaveProperty('practiceQuestions');
  });

  it('exportCsv writes an Excel-friendly CSV and neutralises formulas', async () => {
    const prisma: any = { testAttempt: { findMany: jest.fn().mockResolvedValue([
      row(),
      row({ percentage: 20, user: { id: 'u2', firstName: '=HYPERLINK("x")', lastName: 'B', email: 'b@x.uz' }, test: null }),
    ]) } };
    const csv = await new ResultsService(prisma).exportCsv({});
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('Ali Valiyev;ali@example.com;Algebra;Matematika;EASY;3;4;3;75;O‘tdi;2026-11-12 09:05');
    expect(lines[2].startsWith(`"'=HYPERLINK(""x"") B"`)).toBe(true);
    expect(lines[2]).toContain('Shaxsiy mashq;Mashq');
    expect(lines[2]).toContain('Yiqildi');
  });
});
