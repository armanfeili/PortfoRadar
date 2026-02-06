import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { IngestionModule } from '../ingestion/ingestion.module';

@Module({
  imports: [IngestionModule],
  controllers: [AdminController],
  providers: [AdminApiKeyGuard],
})
export class AdminModule {}
