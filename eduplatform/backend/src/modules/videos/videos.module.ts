import { Module } from '@nestjs/common';
import { GeminiClient } from './gemini.client';
import { VideoFilesService } from './video-files.service';
import { VideoRecommendationService } from './video-recommendation.service';
import { VideosAdminController } from './videos-admin.controller';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';

@Module({ controllers: [VideosAdminController, VideosController], providers: [VideosService, VideoRecommendationService, GeminiClient, VideoFilesService], exports: [VideoFilesService] })
export class VideosModule {}
