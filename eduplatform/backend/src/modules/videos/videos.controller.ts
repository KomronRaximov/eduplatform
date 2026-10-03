import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VideoFilterDto } from './dto/video.dto';
import { VideoRecommendationService } from './video-recommendation.service';
import { VideosService } from './videos.service';

@ApiTags('Videos') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('videos')
export class VideosController {
  constructor(private videos: VideosService, private recommendations: VideoRecommendationService) {}
  @Get() list(@Query() q: VideoFilterDto) { return this.videos.listActive(q.topicId); }
  @Get('recommended') recommended(@CurrentUser() user: JwtUser) { return this.recommendations.recommend(user.sub); }
}
