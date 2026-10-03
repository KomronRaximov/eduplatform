import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminService } from './admin.service';

const fkError = () => new Prisma.PrismaClientKnownRequestError('FK', { code: 'P2003', clientVersion: 'x' });
const files = () => ({ remove: jest.fn().mockResolvedValue(undefined) });

describe('AdminService deletions of used content', () => {
  it('deleteQuestion returns 409 when answers reference the question', async () => {
    const prisma: any = { question: { findUnique: jest.fn().mockResolvedValue({ id: 'q1' }), delete: jest.fn().mockRejectedValue(fkError()) } };
    await expect(new AdminService(prisma, files() as any).deleteQuestion('q1')).rejects.toThrow(ConflictException);
  });
  it('deleteTest returns 409 when attempts or answers reference it', async () => {
    const service = new AdminService({ test: { delete: jest.fn().mockRejectedValue(fkError()) } } as any, files() as any);
    jest.spyOn(service, 'test').mockResolvedValue({} as any);
    await expect(service.deleteTest('t1')).rejects.toThrow(ConflictException);
  });
});

describe('AdminService.deleteTopic removes uploaded video files', () => {
  const make = (deleteImpl: jest.Mock) => {
    const prisma: any = { video: { findMany: jest.fn().mockResolvedValue([{ fileName: 'a.mp4' }, { fileName: 'b.webm' }]) }, topic: { delete: deleteImpl } };
    const f = files();
    const service = new AdminService(prisma, f as any);
    jest.spyOn(service, 'topic').mockResolvedValue({} as any);
    return { service, prisma, f };
  };
  it('deletes the files after the topic is deleted', async () => {
    const { service, prisma, f } = make(jest.fn().mockResolvedValue({}));
    await expect(service.deleteTopic('t1')).resolves.toEqual({ success: true });
    expect(prisma.video.findMany.mock.calls[0][0].where).toEqual({ topicId: 't1', fileName: { not: null } });
    expect(f.remove.mock.calls.map(c => c[0]).sort()).toEqual(['a.mp4', 'b.webm']);
  });
  it('keeps the files and returns 409 when the topic cannot be deleted', async () => {
    const { service, f } = make(jest.fn().mockRejectedValue(fkError()));
    await expect(service.deleteTopic('t1')).rejects.toThrow(ConflictException);
    expect(f.remove).not.toHaveBeenCalled();
  });
});

describe('AdminService.updateUser self-protection', () => {
  const make = () => {
    const prisma: any = { user: { update: jest.fn().mockResolvedValue({}) } };
    const service = new AdminService(prisma, files() as any);
    jest.spyOn(service, 'user').mockResolvedValue({} as any);
    return { service, prisma };
  };
  it('rejects changing own role', async () => {
    const { service, prisma } = make();
    await expect(service.updateUser('u1', { role: 'STUDENT' } as any, 'u1')).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('allows changing another user role', async () => {
    const { service, prisma } = make();
    await service.updateUser('u2', { role: 'TEACHER' } as any, 'u1');
    expect(prisma.user.update).toHaveBeenCalled();
  });
  it('allows editing own currentDifficulty', async () => {
    const { service, prisma } = make();
    await service.updateUser('u1', { currentDifficulty: 'HARD' } as any, 'u1');
    expect(prisma.user.update).toHaveBeenCalled();
  });
});
