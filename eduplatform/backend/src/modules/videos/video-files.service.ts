import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { videosDir } from './video-upload';

@Injectable()
export class VideoFilesService {
  async remove(fileName: string | null | undefined): Promise<void> {
    if (!fileName || path.basename(fileName) !== fileName) return;
    try { await fs.unlink(path.join(videosDir(), fileName)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
}
