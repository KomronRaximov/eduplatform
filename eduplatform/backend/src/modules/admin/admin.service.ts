import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateQuestionDto,
  CreateTestDto,
  CreateTopicDto,
  TestAdminFilterDto,
  UpdateQuestionDto,
  UpdateTestDto,
  UpdateTopicDto,
  UpdateUserDto,
  UserFilterDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private async paginated<T>(
    page: number,
    limit: number,
    count: Promise<number>,
    items: Promise<T[]>,
  ) {
    const total = await count;
    return { items: await items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async dashboard() {
    const [users, tests, questions, attempts] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.test.count(),
      this.prisma.question.count(),
      this.prisma.testAttempt.count(),
    ]);

    return { users, tests, questions, attempts };
  }

  users(q: UserFilterDto) {
    const where: Prisma.UserWhereInput = {
      ...(q.role && { role: q.role }),
      ...(q.search && {
        OR: [
          { firstName: { contains: q.search } },
          { lastName: { contains: q.search } },
          { email: { contains: q.search } },
        ],
      }),
    };

    return this.paginated(
      q.page,
      q.limit,
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          currentDifficulty: true,
          createdAt: true,
        },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async user(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        currentDifficulty: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    await this.user(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        currentDifficulty: true,
      },
    });
  }

  async deleteUser(id: string) {
    await this.user(id);
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  topics() {
    return this.prisma.topic.findMany({
      include: { _count: { select: { tests: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async topic(id: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: { _count: { select: { tests: true } } },
    });

    if (!topic) throw new NotFoundException('Mavzu topilmadi');
    return topic;
  }

  async createTopic(dto: CreateTopicDto) {
    try {
      return await this.prisma.topic.create({ data: dto });
    } catch {
      throw new ConflictException('Bu mavzu nomi allaqachon mavjud');
    }
  }

  async updateTopic(id: string, dto: UpdateTopicDto) {
    await this.topic(id);
    try {
      return await this.prisma.topic.update({ where: { id }, data: dto });
    } catch {
      throw new ConflictException('Bu mavzu nomi allaqachon mavjud');
    }
  }

  async deleteTopic(id: string) {
    await this.topic(id);
    await this.prisma.topic.delete({ where: { id } });
    return { success: true };
  }

  tests(q: TestAdminFilterDto) {
    const where: Prisma.TestWhereInput = {
      ...(q.topicId && { topicId: q.topicId }),
      ...(q.difficulty && { difficulty: q.difficulty }),
      ...(q.search && { title: { contains: q.search } }),
    };

    return this.paginated(
      q.page,
      q.limit,
      this.prisma.test.count({ where }),
      this.prisma.test.findMany({
        where,
        include: { topic: true, _count: { select: { questions: true } } },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async test(id: string) {
    const test = await this.prisma.test.findUnique({
      where: { id },
      include: {
        topic: true,
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!test) throw new NotFoundException('Test topilmadi');
    return test;
  }

  async createTest(dto: CreateTestDto) {
    await this.topic(dto.topicId);
    return this.prisma.test.create({ data: dto });
  }

  async updateTest(id: string, dto: UpdateTestDto) {
    await this.test(id);
    await this.topic(dto.topicId);
    return this.prisma.test.update({ where: { id }, data: dto });
  }

  async deleteTest(id: string) {
    await this.test(id);
    await this.prisma.test.delete({ where: { id } });
    return { success: true };
  }

  private validateOptions(dto: CreateQuestionDto) {
    const optionOrders = new Set(dto.options.map((option) => option.order));
    if (optionOrders.size !== dto.options.length) {
      throw new BadRequestException('Variant tartib raqamlari takrorlanmasligi kerak');
    }

    if (dto.options.filter((option) => option.isCorrect).length !== 1) {
      throw new BadRequestException('Aynan bitta togri javob bolishi kerak');
    }
  }

  async createQuestion(testId: string, dto: CreateQuestionDto) {
    await this.test(testId);
    this.validateOptions(dto);
    return this.prisma.question.create({
      data: {
        testId,
        text: dto.text,
        order: dto.order,
        points: dto.points ?? 1,
        options: { create: dto.options },
      },
      include: { options: true },
    });
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Savol topilmadi');

    this.validateOptions(dto);
    return this.prisma.$transaction(async (tx) => {
      await tx.answerOption.deleteMany({ where: { questionId: id } });
      return tx.question.update({
        where: { id },
        data: {
          text: dto.text,
          order: dto.order,
          points: dto.points ?? 1,
          options: { create: dto.options },
        },
        include: { options: true },
      });
    });
  }

  async deleteQuestion(id: string) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Savol topilmadi');

    await this.prisma.question.delete({ where: { id } });
    return { success: true };
  }
}
