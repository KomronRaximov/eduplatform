import { Module } from '@nestjs/common';
import { AdaptiveService } from './adaptive.service';
@Module({ providers: [AdaptiveService], exports: [AdaptiveService] })
export class AdaptiveModule {}
