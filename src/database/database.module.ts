import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from '../config/env.validation';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      // configService.get will return values matching the EnvConfig type.
      useFactory: (configService: ConfigService<EnvConfig, true>) => ({
        uri: configService.get('MONGO_URI'),
      }),
      inject: [ConfigService], // Pass ConfigService to useFactory
    }),
  ],
})
export class DatabaseModule {}
