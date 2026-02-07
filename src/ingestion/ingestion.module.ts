import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  IngestionRun,
  IngestionRunSchema,
} from './schemas/ingestion-run.schema';
import { KkrClient } from './kkr-client/kkr.client';
import { IngestionRunRepository } from './ingestion-run.repository';
import { PortfolioIngestService } from './portfolio-ingest.service';
import { ScheduledIngestionService } from './scheduled-ingestion.service';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IngestionRun.name, schema: IngestionRunSchema },
    ]),
    CompaniesModule, // Import to access CompaniesRepository
  ],
  providers: [
    KkrClient,
    IngestionRunRepository,
    PortfolioIngestService,
    ScheduledIngestionService,
  ],
  exports: [PortfolioIngestService, IngestionRunRepository],
})
export class IngestionModule {}
