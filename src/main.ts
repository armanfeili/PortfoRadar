import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { EnvConfig } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use pino logger for all logs
  app.useLogger(app.get(Logger));

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
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get<ConfigService<EnvConfig, true>>(ConfigService);
  const port = configService.get('PORT', { infer: true });

  await app.listen(port);
}

void bootstrap();
