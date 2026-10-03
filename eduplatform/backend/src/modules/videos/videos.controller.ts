import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VideoFilterDto } from './dto/video.dto';
import { VideosService } from './videos.service';

@ApiTags('Videos') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('videos')
export class VideosController {
  constructor(private videos: VideosService) {}
  @Get() list(@Query() q: VideoFilterDto) { return this.videos.listActive(q.topicId); }
}
