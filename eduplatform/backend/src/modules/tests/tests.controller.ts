import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TestFilterDto } from './dto/test.dto'; import { TestsService } from './tests.service';
@ApiTags('Tests') @Controller('tests')
export class TestsController {
  constructor(private tests: TestsService) {}
  @Get() list(@Query() filter: TestFilterDto) { return this.tests.list(filter); }
  @Get('recommended') @UseGuards(JwtAuthGuard) @ApiBearerAuth() recommended(@CurrentUser() user: JwtUser) { return this.tests.recommended(user.sub); }
  @Get(':id') get(@Param('id') id: string) { return this.tests.get(id); }
  @Post(':id/start') @UseGuards(JwtAuthGuard) @ApiBearerAuth() start(@CurrentUser() user: JwtUser, @Param('id') id: string) { return this.tests.start(user.sub, id); }
}
