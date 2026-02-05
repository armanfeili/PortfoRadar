/**
 * Quick test script to verify upsert idempotency.
 * Run with: npx ts-node src/scripts/test-upsert.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CompaniesRepository } from '../companies/companies.repository';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get(CompaniesRepository);

  const testCompany = {
    companyId: 'test-company-001',
    name: 'Test Company',
    nameSort: 'test company',
    assetClassRaw: 'Private Equity',
    assetClasses: ['Private Equity'],
    industry: 'Technology',
    region: 'Americas',
    source: {
      listUrl: 'https://example.com/list',
      endpoint: 'test-endpoint',
      fetchedAt: new Date(),
    },
  };

  console.log('\n=== Upsert Idempotency Test ===\n');

  // Clear any existing test data
  await repo.deleteAll();
  console.log('1. Cleared existing data');

  // First upsert
  const result1 = await repo.upsertCompany(testCompany);
  const count1 = await repo.countAll();
  console.log(
    `2. First upsert: created=${result1.created}, updated=${result1.updated}`,
  );
  console.log(`   Total companies: ${count1}`);

  // Second upsert (same company)
  const result2 = await repo.upsertCompany(testCompany);
  const count2 = await repo.countAll();
  console.log(
    `3. Second upsert: created=${result2.created}, updated=${result2.updated}`,
  );
  console.log(`   Total companies: ${count2}`);

  // Third upsert with modified data
  const result3 = await repo.upsertCompany({
    ...testCompany,
    industry: 'Software', // Changed field
  });
  const count3 = await repo.countAll();
  console.log(
    `4. Third upsert (modified): created=${result3.created}, updated=${result3.updated}`,
  );
  console.log(`   Total companies: ${count3}`);

  // Verify the company was updated
  const company = await repo.findByCompanyId('test-company-001');
  console.log(`5. Company industry after update: ${company?.industry}`);

  // Cleanup
  await repo.deleteAll();
  console.log('6. Cleaned up test data');

  // Summary
  console.log('\n=== Results ===');
  if (
    count1 === 1 &&
    count2 === 1 &&
    count3 === 1 &&
    company?.industry === 'Software'
  ) {
    console.log('✅ PASS: Upsert is idempotent - no duplicates created');
  } else {
    console.log('❌ FAIL: Upsert created duplicates or update failed');
    console.log(`   Counts: ${count1}, ${count2}, ${count3}`);
    console.log(`   Industry: ${company?.industry}`);
  }

  await app.close();
}

main().catch(console.error);
