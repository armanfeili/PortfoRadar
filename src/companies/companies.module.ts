import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from './schemas/company.schema';
import { CompaniesRepository } from './companies.repository';
import { CompaniesService } from './companies.service';
import { CompaniesController, StatsController } from './companies.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }]),
  ],
  controllers: [CompaniesController, StatsController],
  providers: [CompaniesRepository, CompaniesService],
  exports: [CompaniesRepository, CompaniesService, MongooseModule],
})
export class CompaniesModule {}
