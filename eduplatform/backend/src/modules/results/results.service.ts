import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRole } from '../../common/types/database.enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ResultFilterDto } from './dto/result-filter.dto';

/** Natija shu foizdan past bo'lsa test "yiqilgan" hisoblanadi (practice/video tavsiyalari bilan bir xil chegara). */
export const PASS_PERCENTAGE = 50;
export const EXPORT_LIMIT = 5000;

const studentSelect = { id: true, firstName: true, lastName: true, email: true } as const;
const listInclude = { user: { select: studentSelect }, test: { select: { id: true, title: true, topic: { select: { id: true, name: true } } } } } as const;

type Filters = Omit<ResultFilterDto, 'page' | 'limit'>;

export function buildResultWhere(q: Filters): Prisma.TestAttemptWhereInput {
  const search = q.search?.trim();
  return {
    finishedAt: { not: null },
    user: {
      role: UserRole.STUDENT,
      ...(search && { OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }, { email: { contains: search } }] }),
    },
    ...(q.testId && { testId: q.testId }),
    ...(q.topicId && { test: { topicId: q.topicId } }),
    ...(q.kind === 'TEST' && { isPractice: false }),
    ...(q.kind === 'PRACTICE' && { isPractice: true }),
    ...(q.status === 'PASSED' && { percentage: { gte: PASS_PERCENTAGE } }),
    ...(q.status === 'FAILED' && { percentage: { lt: PASS_PERCENTAGE } }),
  };
}

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  // Excel formulalarini bloklash (CSV injection) va maxsus belgilarni qo'shtirnoqqa olish
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",;\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const formatDate = (date: Date | null) => {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

@Injectable()
export class ResultsService {
  constructor(private prisma: PrismaService) {}

  async list(q: ResultFilterDto) {
    const where = buildResultWhere(q);
    const [total, aggregate, passed, items] = await Promise.all([
      this.prisma.testAttempt.count({ where }),
      this.prisma.testAttempt.aggregate({ where, _avg: { percentage: true } }),
      this.prisma.testAttempt.count({ where: { AND: [where, { percentage: { gte: PASS_PERCENTAGE } }] } }),
      this.prisma.testAttempt.findMany({ where, include: listInclude, orderBy: { finishedAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
    ]);
    return {
      items,
      meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
      summary: { total, passed, failed: total - passed, averagePercentage: Number((aggregate._avg.percentage ?? 0).toFixed(1)), passPercentage: PASS_PERCENTAGE },
    };
  }

  async get(id: string) {
    const attempt = await this.prisma.testAttempt.findFirst({
      where: { id, finishedAt: { not: null }, user: { role: UserRole.STUDENT } },
      include: {
        ...listInclude,
        answers: {
          include: {
            question: { select: { id: true, text: true, order: true, points: true, options: { select: { id: true, text: true, order: true, isCorrect: true }, orderBy: { order: 'asc' } } } },
          },
        },
        practiceQuestions: { select: { questionId: true, order: true } },
      },
    });
    if (!attempt) throw new NotFoundException('Natija topilmadi');

    const practiceOrder = new Map(attempt.practiceQuestions.map(p => [p.questionId, p.order]));
    const sortKey = (questionId: string, order: number) => (attempt.isPractice ? practiceOrder.get(questionId) ?? order : order);
    const answers = [...attempt.answers]
      .sort((a, b) => sortKey(a.questionId, a.question.order) - sortKey(b.questionId, b.question.order))
      .map(a => ({ questionId: a.questionId, text: a.question.text, points: a.question.points, earned: a.points, isCorrect: a.isCorrect, selectedOptionId: a.selectedOptionId, options: a.question.options }));

    const { answers: _raw, practiceQuestions: _order, ...rest } = attempt;
    return { ...rest, answers, passPercentage: PASS_PERCENTAGE };
  }

  async exportCsv(q: Filters) {
    const rows = await this.prisma.testAttempt.findMany({ where: buildResultWhere(q), include: listInclude, orderBy: { finishedAt: 'desc' }, take: EXPORT_LIMIT });
    const header = ['O‘quvchi', 'Email', 'Test', 'Mavzu', 'Daraja', 'To‘g‘ri', 'Savollar', 'Ball', 'Foiz', 'Holat', 'Sana'];
    const lines = rows.map(r => [
      `${r.user.firstName} ${r.user.lastName}`,
      r.user.email,
      r.test?.title ?? 'Shaxsiy mashq',
      r.test?.topic.name ?? 'Mashq',
      r.difficulty,
      r.correctAnswers,
      r.totalQuestions,
      r.score,
      r.percentage,
      r.percentage >= PASS_PERCENTAGE ? 'O‘tdi' : 'Yiqildi',
      formatDate(r.finishedAt),
    ]);
    // Excel uchun: BOM (UTF-8) + nuqtali vergul ajratgich
    return '﻿' + [header, ...lines].map(line => line.map(csvCell).join(';')).join('\r\n') + '\r\n';
  }
}
