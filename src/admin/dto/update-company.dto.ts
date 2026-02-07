import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for related link updates.
 */
class UpdateRelatedLinkDto {
  @ApiPropertyOptional({
    example:
      'https://www.kkr.com/news/press-release/kkr-invests-in-beacon-pointe',
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ example: 'KKR Invests in Beacon Pointe' })
  @IsOptional()
  @IsString()
  title?: string;
}

/**
 * DTO for related links updates.
 */
// RelatedLinksDto class removed - using RelatedLinkDto[] instead

/**
 * DTO for updating a company.
 * All fields are optional — only provided fields will be updated.
 */
export class UpdateCompanyDto {
  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Acme Corporation',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Raw asset class string (comma-separated)',
    example: 'Private Equity, Tech Growth',
  })
  @IsOptional()
  @IsString()
  assetClassRaw?: string;

  @ApiPropertyOptional({
    description: 'Asset classes as array',
    example: ['Private Equity', 'Tech Growth'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assetClasses?: string[];

  @ApiPropertyOptional({
    description: 'Industry sector',
    example: 'Technology',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Geographic region',
    example: 'Americas',
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({
    description: 'HTML description',
    example: '<p>A leading technology company...</p>',
  })
  @IsOptional()
  @IsString()
  descriptionHtml?: string;

  @ApiPropertyOptional({
    description: 'Plain text description',
    example: 'A leading technology company...',
  })
  @IsOptional()
  @IsString()
  descriptionText?: string;

  @ApiPropertyOptional({
    description: 'Company website URL',
    example: 'https://acme.com',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Headquarters location',
    example: 'San Francisco, CA',
  })
  @IsOptional()
  @IsString()
  headquarters?: string;

  @ApiPropertyOptional({
    description: 'Year of investment',
    example: '2023',
  })
  @IsOptional()
  @IsString()
  yearOfInvestment?: string;

  @ApiPropertyOptional({
    description: 'Logo path (relative)',
    example: '/content/dam/kkr/logos/acme.png',
  })
  @IsOptional()
  @IsString()
  logoPath?: string;

  @ApiPropertyOptional({
    description: 'Full logo URL',
    example: 'https://www.kkr.com/content/dam/kkr/logos/acme.png',
  })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Related links (press releases, videos)',
    type: [UpdateRelatedLinkDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateRelatedLinkDto)
  relatedLinks?: UpdateRelatedLinkDto[];
}
