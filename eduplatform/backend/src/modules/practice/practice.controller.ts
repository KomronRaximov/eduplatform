import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubmitAttemptDto } from '../attempts/dto/submit-attempt.dto';
import { PracticeService } from './practice.service';

@ApiTags('Practice') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('practice')
export class PracticeController {
  constructor(private practice: PracticeService) {}
  @Post('start') start(@CurrentUser() user: JwtUser) { return this.practice.start(user.sub); }
  @Get('overview') overview(@CurrentUser() user: JwtUser) { return this.practice.overview(user.sub); }
  @Post(':attemptId/submit') submit(@CurrentUser() user: JwtUser, @Param('attemptId') attemptId: string, @Body() dto: SubmitAttemptDto) { return this.practice.submit(user.sub, attemptId, dto); }
}
