import { ApiProperty } from '@nestjs/swagger';

/**
 * Aggregated statistics response DTO.
 */
export class StatsResponseDto {
  @ApiProperty({
    description: 'Total number of companies in the database',
    example: 296,
  })
  totalCompanies: number;

  @ApiProperty({
    description:
      'Company counts by asset class (totals may exceed totalCompanies due to multi-class companies)',
    example: {
      'Private Equity': 148,
      Infrastructure: 67,
      'Tech Growth': 55,
      'Health Care Growth': 30,
      'Global Impact': 18,
    },
  })
  byAssetClass: Record<string, number>;

  @ApiProperty({
    description: 'Company counts by industry',
    example: {
      Financials: 17,
      'Consumer Discretionary': 30,
      Technology: 45,
    },
  })
  byIndustry: Record<string, number>;

  @ApiProperty({
    description: 'Company counts by region',
    example: {
      Americas: 123,
      'Asia Pacific': 93,
      'Europe, The Middle East And Africa': 79,
      Japan: 1,
    },
  })
  byRegion: Record<string, number>;
}
