import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QueryCompaniesDto } from './query-companies.dto';

describe('QueryCompaniesDto', () => {
  function toDto(plain: Record<string, unknown>): QueryCompaniesDto {
    return plainToInstance(QueryCompaniesDto, plain);
  }

  it('should pass with no parameters (all optional)', async () => {
    const dto = toDto({});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with valid parameters', async () => {
    const dto = toDto({
      assetClass: 'Private Equity',
      industry: 'Technology',
      region: 'Americas',
      q: 'acme',
      page: 1,
      limit: 20,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with page less than 1', async () => {
    const dto = toDto({ page: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('page');
  });

  it('should fail with limit greater than 100', async () => {
    const dto = toDto({ limit: 200 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('should fail with limit less than 1', async () => {
    const dto = toDto({ limit: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('should transform string page to number', async () => {
    const dto = toDto({ page: '3' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(3);
  });

  it('should transform string limit to number', async () => {
    const dto = toDto({ limit: '50' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(50);
  });

  it('should fail with excessively long search query', async () => {
    const dto = toDto({ q: 'a'.repeat(201) });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('q');
  });

  it('should accept search query at max length', async () => {
    const dto = toDto({ q: 'a'.repeat(200) });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should default page to 1', () => {
    const dto = toDto({});
    expect(dto.page).toBe(1);
  });

  it('should default limit to 20', () => {
    const dto = toDto({});
    expect(dto.limit).toBe(20);
  });
});
