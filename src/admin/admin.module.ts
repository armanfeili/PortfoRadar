import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { AdminKeyService } from './admin-key.service';
import { AdminKey, AdminKeySchema } from './schemas/admin-key.schema';
import { IngestionModule } from '../ingestion/ingestion.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminKey.name, schema: AdminKeySchema },
    ]),
    IngestionModule,
    CompaniesModule,
  ],
  controllers: [AdminController],
  providers: [AdminApiKeyGuard, AdminKeyService],
  exports: [AdminKeyService],
})
export class AdminModule {}
