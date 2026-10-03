import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TopicsModule } from './modules/topics/topics.module';
import { TestsModule } from './modules/tests/tests.module';
import { AttemptsModule } from './modules/attempts/attempts.module';
import { AdaptiveModule } from './modules/adaptive/adaptive.module';
import { PracticeModule } from './modules/practice/practice.module';
import { VideosModule } from './modules/videos/videos.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ProgressModule } from './modules/progress/progress.module';
import { AdminModule } from './modules/admin/admin.module';
import { UsersModule } from './modules/users/users.module';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, UsersModule, TopicsModule, TestsModule, AttemptsModule, AdaptiveModule, PracticeModule, VideosModule, DashboardModule, ProgressModule, AdminModule] })
export class AppModule {}
