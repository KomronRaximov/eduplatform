import { Module } from '@nestjs/common';
import { QuestionStatsService } from './question-stats.service';

@Module({ providers: [QuestionStatsService], exports: [QuestionStatsService] })
export class PracticeModule {}
