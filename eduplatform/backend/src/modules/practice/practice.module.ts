import { Module } from '@nestjs/common';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';
import { QuestionStatsService } from './question-stats.service';

@Module({ controllers: [PracticeController], providers: [PracticeService, QuestionStatsService], exports: [QuestionStatsService] })
export class PracticeModule {}
