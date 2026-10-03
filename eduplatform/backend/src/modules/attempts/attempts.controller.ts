import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Difficulty } from '../../common/types/database.enums';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator'; import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AttemptsService } from './attempts.service'; import { SubmitAttemptDto } from './dto/submit-attempt.dto';
@ApiTags('Attempts') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('attempts')
export class AttemptsController {
 constructor(private attempts: AttemptsService) {}
 @Post(':id/submit') submit(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: SubmitAttemptDto) { return this.attempts.submit(user.sub, id, dto); }
 @Get('history') history(@CurrentUser() user: JwtUser, @Query('topicId') topicId?: string, @Query('difficulty') difficulty?: Difficulty) { return this.attempts.history(user.sub, topicId, difficulty); }
 @Get(':id') get(@CurrentUser() user: JwtUser, @Param('id') id: string) { return this.attempts.get(user.sub, id); }
}
