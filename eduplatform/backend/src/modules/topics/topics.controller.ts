import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TopicsService } from './topics.service';
@ApiTags('Topics') @Controller('topics')
export class TopicsController { constructor(private topics: TopicsService) {} @Get() list() { return this.topics.list(); } @Get(':id') get(@Param('id') id: string) { return this.topics.get(id); } }
