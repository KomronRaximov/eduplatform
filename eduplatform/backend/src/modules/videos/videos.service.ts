import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { VideoType } from '../../common/types/database.enums';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVideoDto, UpdateVideoDto } from './dto/video.dto';
import { VideoFilesService } from './video-files.service';
import { extractYoutubeId } from './youtube';

export type VideoDto = { id: string; topicId: string; topic: { id: string; name: string }; title: string; description: string | null; difficulty: string | null; type: string; youtubeId: string | null; fileUrl: string | null; isActive: boolean };
export type UploadedVideo = { filename: string; mimetype: string; size: number };

const withTopic = { topic: { select: { id: true, name: true } } } satisfies Prisma.VideoInclude;
type VideoRow = Prisma.VideoGetPayload<{ include: typeof withTopic }>;

export const toVideoDto = (video: VideoRow): VideoDto => ({ id: video.id, topicId: video.topicId, topic: video.topic, title: video.title, description: video.description, difficulty: video.difficulty, type: video.type, youtubeId: video.youtubeId, fileUrl: video.fileName ? `/api/uploads/videos/${video.fileName}` : null, isActive: video.isActive });

@Injectable()
export class VideosService {
  constructor(private prisma: PrismaService, private files: VideoFilesService) {}

  async listAdmin(topicId?: string): Promise<VideoDto[]> {
    const rows = await this.prisma.video.findMany({ where: topicId ? { topicId } : {}, include: withTopic, orderBy: { createdAt: 'desc' } });
    return rows.map(toVideoDto);
  }

  async listActive(topicId?: string): Promise<VideoDto[]> {
    const rows = await this.prisma.video.findMany({ where: { isActive: true, topic: { isActive: true }, ...(topicId && { topicId }) }, include: withTopic, orderBy: [{ topic: { name: 'asc' } }, { createdAt: 'desc' }] });
    return rows.map(toVideoDto);
  }

  async create(dto: CreateVideoDto, file?: UploadedVideo): Promise<VideoDto> {
    try {
      await this.assertTopic(dto.topicId);
      let data: { type: string; youtubeId: string | null; fileName: string | null };
      if (dto.type === VideoType.YOUTUBE) {
        if (file) throw new BadRequestException('YouTube video uchun fayl yuklanmaydi');
        data = { type: VideoType.YOUTUBE, youtubeId: this.youtubeIdOrThrow(dto.youtubeUrl), fileName: null };
      } else {
        if (!file) throw new BadRequestException('Video faylni tanlang');
        if (dto.youtubeUrl) throw new BadRequestException('Yuklangan video uchun YouTube havolasi kerak emas');
        data = { type: VideoType.UPLOAD, youtubeId: null, fileName: file.filename };
      }
      const row = await this.prisma.video.create({ data: { topicId: dto.topicId, title: dto.title, description: dto.description ?? null, difficulty: dto.difficulty ?? null, ...data }, include: withTopic });
      return toVideoDto(row);
    } catch (error) {
      if (file) await this.files.remove(file.filename);
      throw error;
    }
  }

  async update(id: string, dto: UpdateVideoDto, file?: UploadedVideo): Promise<VideoDto> {
    try {
      const existing = await this.prisma.video.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Video topilmadi');
      if (dto.topicId) await this.assertTopic(dto.topicId);
      const data: Prisma.VideoUncheckedUpdateInput = {};
      for (const key of ['topicId', 'title', 'description', 'difficulty', 'isActive'] as const) if (dto[key] !== undefined) (data as Record<string, unknown>)[key] = dto[key];
      let oldFile: string | null = null;
      if (file) {
        if (dto.type === VideoType.YOUTUBE) throw new BadRequestException('YouTube video uchun fayl yuklanmaydi');
        Object.assign(data, { type: VideoType.UPLOAD, youtubeId: null, fileName: file.filename });
        oldFile = existing.fileName;
      } else if (dto.youtubeUrl !== undefined || (dto.type === VideoType.YOUTUBE && existing.type !== VideoType.YOUTUBE)) {
        Object.assign(data, { type: VideoType.YOUTUBE, youtubeId: this.youtubeIdOrThrow(dto.youtubeUrl), fileName: null });
        oldFile = existing.fileName;
      } else if (dto.type === VideoType.UPLOAD && existing.type !== VideoType.UPLOAD) {
        throw new BadRequestException('Video faylni tanlang');
      }
      const row = await this.prisma.video.update({ where: { id }, data, include: withTopic });
      if (oldFile) await this.files.remove(oldFile);
      return toVideoDto(row);
    } catch (error) {
      if (file) await this.files.remove(file.filename);
      throw error;
    }
  }

  async remove(id: string): Promise<{ success: true }> {
    const existing = await this.prisma.video.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Video topilmadi');
    await this.prisma.video.delete({ where: { id } });
    await this.files.remove(existing.fileName);
    return { success: true };
  }

  private async assertTopic(topicId: string) {
    if (!(await this.prisma.topic.findUnique({ where: { id: topicId } }))) throw new NotFoundException('Mavzu topilmadi');
  }

  private youtubeIdOrThrow(url?: string): string {
    const id = extractYoutubeId(url ?? '');
    if (!id) throw new BadRequestException('YouTube havolasi noto‘g‘ri');
    return id;
  }
}
