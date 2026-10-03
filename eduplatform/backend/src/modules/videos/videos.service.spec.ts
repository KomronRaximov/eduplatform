import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VideosService } from './videos.service';

const topic = { id: 't1', name: 'Matematika' };
const row = (over: any = {}) => ({ id: 'v1', topicId: 't1', topic, title: 'Dars', description: null, difficulty: null, type: 'YOUTUBE', youtubeId: 'dQw4w9WgXcQ', fileName: null, isActive: true, ...over });
const URL_OK = 'https://youtu.be/dQw4w9WgXcQ';
const file = { filename: 'new.mp4', mimetype: 'video/mp4', size: 10 };

function setup(existing: any = null, topicExists = true) {
  const prisma: any = {
    topic: { findUnique: jest.fn().mockResolvedValue(topicExists ? topic : null) },
    video: { findUnique: jest.fn().mockResolvedValue(existing), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(async ({ data }: any) => row(data)), update: jest.fn(async ({ data }: any) => row({ ...existing, ...data })), delete: jest.fn().mockResolvedValue({}) },
  };
  const files = { remove: jest.fn().mockResolvedValue(undefined) };
  return { service: new VideosService(prisma, files as any), prisma, files };
}

describe('VideosService.create', () => {
  it('stores a youtube video with the extracted id', async () => {
    const { service, prisma } = setup();
    const dto = await service.create({ topicId: 't1', title: 'Dars', type: 'YOUTUBE', youtubeUrl: URL_OK } as any);
    expect(prisma.video.create.mock.calls[0][0].data).toMatchObject({ type: 'YOUTUBE', youtubeId: 'dQw4w9WgXcQ', fileName: null });
    expect(dto).toMatchObject({ youtubeId: 'dQw4w9WgXcQ', fileUrl: null });
  });
  it('stores an uploaded video and exposes its file url', async () => {
    const { service } = setup();
    const dto = await service.create({ topicId: 't1', title: 'Dars', type: 'UPLOAD' } as any, file);
    expect(dto).toMatchObject({ type: 'UPLOAD', youtubeId: null, fileUrl: '/api/uploads/videos/new.mp4' });
  });
  it('rejects an invalid youtube url', async () => {
    const { service } = setup();
    await expect(service.create({ topicId: 't1', title: 'x', type: 'YOUTUBE', youtubeUrl: 'https://evil.com/watch?v=dQw4w9WgXcQ' } as any)).rejects.toThrow(BadRequestException);
  });
  it('rejects mismatched fields and removes the uploaded file', async () => {
    const a = setup(); await expect(a.service.create({ topicId: 't1', title: 'x', type: 'YOUTUBE', youtubeUrl: URL_OK } as any, file)).rejects.toThrow(BadRequestException); expect(a.files.remove).toHaveBeenCalledWith('new.mp4');
    const b = setup(); await expect(b.service.create({ topicId: 't1', title: 'x', type: 'UPLOAD' } as any)).rejects.toThrow(BadRequestException);
    const c = setup(); await expect(c.service.create({ topicId: 't1', title: 'x', type: 'UPLOAD', youtubeUrl: URL_OK } as any, file)).rejects.toThrow(BadRequestException); expect(c.files.remove).toHaveBeenCalledWith('new.mp4');
  });
  it('rejects an unknown topic and removes the uploaded file', async () => {
    const { service, files } = setup(null, false);
    await expect(service.create({ topicId: 'nope', title: 'x', type: 'UPLOAD' } as any, file)).rejects.toThrow(NotFoundException);
    expect(files.remove).toHaveBeenCalledWith('new.mp4');
  });
});

describe('VideosService.update', () => {
  it('switching an upload to youtube sets the id, clears the file and removes it from disk', async () => {
    const { service, prisma, files } = setup(row({ type: 'UPLOAD', youtubeId: null, fileName: 'old.mp4' }));
    await service.update('v1', { type: 'YOUTUBE', youtubeUrl: URL_OK } as any);
    expect(prisma.video.update.mock.calls[0][0].data).toMatchObject({ type: 'YOUTUBE', youtubeId: 'dQw4w9WgXcQ', fileName: null });
    expect(files.remove).toHaveBeenCalledWith('old.mp4');
  });
  it('switching youtube to an upload clears the youtube id', async () => {
    const { service, prisma, files } = setup(row());
    await service.update('v1', { type: 'UPLOAD' } as any, file);
    expect(prisma.video.update.mock.calls[0][0].data).toMatchObject({ type: 'UPLOAD', youtubeId: null, fileName: 'new.mp4' });
    expect(files.remove).not.toHaveBeenCalled();
  });
  it('replacing an uploaded file removes the old one', async () => {
    const { service, files } = setup(row({ type: 'UPLOAD', youtubeId: null, fileName: 'old.mp4' }));
    await service.update('v1', {} as any, file);
    expect(files.remove).toHaveBeenCalledWith('old.mp4');
  });
  it('leaves untouched fields alone', async () => {
    const { service, prisma } = setup(row());
    await service.update('v1', { title: 'Yangi' } as any);
    expect(prisma.video.update.mock.calls[0][0].data).toEqual({ title: 'Yangi' });
  });
  it('rejects switching to upload without a file and removes a stray new file on errors', async () => {
    const a = setup(row()); await expect(a.service.update('v1', { type: 'UPLOAD' } as any)).rejects.toThrow(BadRequestException);
    const b = setup(row()); await expect(b.service.update('v1', { type: 'YOUTUBE' } as any, file)).rejects.toThrow(BadRequestException); expect(b.files.remove).toHaveBeenCalledWith('new.mp4');
    const c = setup(null); await expect(c.service.update('zzz', {} as any, file)).rejects.toThrow(NotFoundException); expect(c.files.remove).toHaveBeenCalledWith('new.mp4');
  });
});

describe('VideosService.remove', () => {
  it('deletes the row and its file', async () => {
    const { service, prisma, files } = setup(row({ type: 'UPLOAD', youtubeId: null, fileName: 'old.mp4' }));
    await expect(service.remove('v1')).resolves.toEqual({ success: true });
    expect(prisma.video.delete).toHaveBeenCalledWith({ where: { id: 'v1' } });
    expect(files.remove).toHaveBeenCalledWith('old.mp4');
  });
  it('404s for unknown videos', async () => {
    await expect(setup(null).service.remove('zzz')).rejects.toThrow(NotFoundException);
  });
});

describe('VideosService.listActive', () => {
  it('only lists active videos of active topics, optionally by topic', async () => {
    const { service, prisma } = setup();
    await service.listActive();
    expect(prisma.video.findMany.mock.calls[0][0].where).toEqual({ isActive: true, topic: { isActive: true } });
    await service.listActive('t1');
    expect(prisma.video.findMany.mock.calls[1][0].where).toEqual({ isActive: true, topic: { isActive: true }, topicId: 't1' });
  });
});
