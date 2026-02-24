import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { EnvConfig, validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { CompaniesModule } from './companies/companies.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      // For environment variables
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(), // For cron jobs
    ThrottlerModule.forRootAsync({
      // for rate limiting
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) => [
        {
          ttl: configService.get('THROTTLE_TTL', { infer: true }),
          limit: configService.get('THROTTLE_LIMIT', { infer: true }),
        },
      ],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
        redact: {
          // For security - redacts sensitive information
          paths: ['req.headers.authorization', 'MONGO_URI', '*.MONGO_URI'],
          censor: '[REDACTED]',
        },
      },
    }),
    DatabaseModule,
    HealthModule,
    CompaniesModule,
    IngestionModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD, // For rate limiting
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
