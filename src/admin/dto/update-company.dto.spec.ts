import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateCompanyDto } from './update-company.dto';

describe('UpdateCompanyDto', () => {
  function toDto(plain: Record<string, unknown>): UpdateCompanyDto {
    return plainToInstance(UpdateCompanyDto, plain);
  }

  it('should pass with no parameters (all optional)', async () => {
    const dto = toDto({});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with valid partial update', async () => {
    const dto = toDto({
      name: 'Acme Corp',
      industry: 'Technology',
      region: 'Americas',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with valid website URL', async () => {
    const dto = toDto({ website: 'https://acme.com' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with invalid website URL', async () => {
    const dto = toDto({ website: 'not-a-valid-url' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('website');
  });

  it('should pass with valid logoUrl', async () => {
    const dto = toDto({
      logoUrl: 'https://www.kkr.com/content/dam/kkr/logos/acme.png',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with invalid logoUrl', async () => {
    const dto = toDto({ logoUrl: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('logoUrl');
  });

  it('should pass with assetClasses array', async () => {
    const dto = toDto({
      assetClasses: ['Private Equity', 'Tech Growth'],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with relatedLinks', async () => {
    const dto = toDto({
      relatedLinks: [
        { url: 'https://example.com/news', title: 'Press Release' },
      ],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with all optional fields', async () => {
    const dto = toDto({
      name: 'Acme Corp',
      assetClassRaw: 'Private Equity, Tech Growth',
      assetClasses: ['Private Equity', 'Tech Growth'],
      industry: 'Technology',
      region: 'Americas',
      descriptionHtml: '<p>Description</p>',
      descriptionText: 'Description',
      website: 'https://acme.com',
      headquarters: 'San Francisco, CA',
      yearOfInvestment: '2023',
      logoPath: '/content/dam/kkr/logo.png',
      logoUrl: 'https://www.kkr.com/content/dam/kkr/logo.png',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
