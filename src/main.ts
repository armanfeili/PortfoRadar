import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { json } from 'express';
import { AppModule } from './app.module';
import { EnvConfig } from './config/env.validation';
import { HttpExceptionFilter } from './common/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use pino logger for all logs
  app.useLogger(app.get(Logger));

  // Basic security hardening
  app.use(helmet());
  app.use(
    json({
      limit: '1mb',
    }),
  );

  // Apply global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable global validation pipe with security settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Reject requests with unknown properties
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('PortfoRadar API')
    .setDescription(
      'REST API for querying KKR portfolio companies. Provides endpoints for listing, filtering, and retrieving company data with aggregated statistics.',
    )
    .setVersion('1.0')
    .addTag('Companies', 'Portfolio company operations')
    .addTag('Stats', 'Aggregated statistics')
    .addTag('Health', 'System health checks')
    .addTag('Admin', 'Administrative operations')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get<ConfigService<EnvConfig, true>>(ConfigService);
  const allowedOrigins =
    configService.get('ALLOWED_ORIGINS', { infer: true }) ?? undefined;
  const corsOrigin =
    process.env.NODE_ENV === 'production' && allowedOrigins
      ? allowedOrigins.split(',').map((origin) => origin.trim())
      : '*';

  app.enableCors({
    origin: corsOrigin,
  });

  const port = configService.get('PORT', { infer: true });

  await app.listen(port);
}

void bootstrap();
