import { Module } from '@nestjs/common'; import { AdaptiveModule } from '../adaptive/adaptive.module'; import { AttemptsController } from './attempts.controller'; import { AttemptsService } from './attempts.service';
@Module({ imports: [AdaptiveModule], controllers: [AttemptsController], providers: [AttemptsService] }) export class AttemptsModule {}
