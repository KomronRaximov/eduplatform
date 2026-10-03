import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/types/database.enums';
import { CreateVideoDto, UpdateVideoDto, VideoFilterDto } from './dto/video.dto';
import { videoMulterOptions } from './video-upload';
import { VideosService } from './videos.service';

@ApiTags('Admin videos') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Controller('admin/videos')
export class VideosAdminController {
  constructor(private videos: VideosService) {}
  @Get() list(@Query() q: VideoFilterDto) { return this.videos.listAdmin(q.topicId); }
  @Post() @ApiConsumes('multipart/form-data') @UseInterceptors(FileInterceptor('file', videoMulterOptions)) create(@Body() dto: CreateVideoDto, @UploadedFile() file?: Express.Multer.File) { return this.videos.create(dto, file); }
  @Patch(':id') @ApiConsumes('multipart/form-data') @UseInterceptors(FileInterceptor('file', videoMulterOptions)) update(@Param('id') id: string, @Body() dto: UpdateVideoDto, @UploadedFile() file?: Express.Multer.File) { return this.videos.update(id, dto, file); }
  @Delete(':id') remove(@Param('id') id: string) { return this.videos.remove(id); }
}
