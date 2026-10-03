import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminService } from './admin.service';

const fkError = () => new Prisma.PrismaClientKnownRequestError('FK', { code: 'P2003', clientVersion: 'x' });

describe('AdminService deletions of used content', () => {
  it('deleteQuestion returns 409 when answers reference the question', async () => {
    const prisma: any = { question: { findUnique: jest.fn().mockResolvedValue({ id: 'q1' }), delete: jest.fn().mockRejectedValue(fkError()) } };
    await expect(new AdminService(prisma).deleteQuestion('q1')).rejects.toThrow(ConflictException);
  });
  it('deleteTest returns 409 when attempts or answers reference it', async () => {
    const service = new AdminService({ test: { delete: jest.fn().mockRejectedValue(fkError()) } } as any);
    jest.spyOn(service, 'test').mockResolvedValue({} as any);
    await expect(service.deleteTest('t1')).rejects.toThrow(ConflictException);
  });
});
