import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.error(
        [
          'Cannot open the SQLite database.',
          `DATABASE_URL=${maskDatabaseUrl(process.env.DATABASE_URL)}`,
          'Confirm that the database directory is writable.',
          'Then run backend migrations: from backend run `npm run prisma:migrate`.',
        ].join('\n'),
      );

      throw error;
    }
  }

  async onModuleDestroy() { await this.$disconnect(); }
  async enableShutdownHooks(app: INestApplication) { (this.$on as any)('beforeExit', async () => app.close()); }
}

function maskDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    return '(not set)';
  }

  try {
    const url = new URL(databaseUrl);

    if (url.password) {
      url.password = '***';
    }

    return url.toString();
  } catch {
    return '(invalid DATABASE_URL)';
  }
}
