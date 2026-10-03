import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}
  list() { return this.prisma.topic.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, include: { _count: { select: { tests: { where: { isActive: true } } } } } }); }
  async get(id: string) { const topic = await this.prisma.topic.findFirst({ where: { id, isActive: true }, include: { _count: { select: { tests: true } } } }); if (!topic) throw new NotFoundException('Mavzu topilmadi'); return topic; }
}
