import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAdminKeyDto } from './create-admin-key.dto';

describe('CreateAdminKeyDto', () => {
  function toDto(plain: Record<string, unknown>): CreateAdminKeyDto {
    return plainToInstance(CreateAdminKeyDto, plain);
  }

  it('should pass with no parameters (ttlMinutes optional)', async () => {
    const dto = toDto({});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with valid ttlMinutes', async () => {
    const dto = toDto({ ttlMinutes: 30 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.ttlMinutes).toBe(30);
  });

  it('should pass with minimum TTL of 5', async () => {
    const dto = toDto({ ttlMinutes: 5 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with maximum TTL of 1440', async () => {
    const dto = toDto({ ttlMinutes: 1440 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with ttlMinutes less than 5', async () => {
    const dto = toDto({ ttlMinutes: 4 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('ttlMinutes');
  });

  it('should fail with ttlMinutes greater than 1440', async () => {
    const dto = toDto({ ttlMinutes: 1441 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('ttlMinutes');
  });

  it('should fail with ttlMinutes of 0', async () => {
    const dto = toDto({ ttlMinutes: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should default ttlMinutes to 30 when not provided', () => {
    const dto = toDto({});
    expect(dto.ttlMinutes).toBe(30);
  });
});
