/**
 * Script to analyze ID collisions in KKR data
 *
 * Uses NestJS bootstrap to leverage existing KkrClient with proper headers.
 * Compares different ID strategies to find the best one.
 *
 * Usage: npx ts-node src/scripts/collision-report.ts
 */

import { NestFactory } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { AppModule } from '../app.module';
import { KkrClient } from '../ingestion/kkr-client/kkr.client';
import { KkrRawCompany } from '../ingestion/kkr-client/kkr-api.types';

// Current ID generation (name + hq)
function generateIdNameHq(raw: KkrRawCompany): string {
  const keyParts = [
    raw.name.toLowerCase().trim(),
    (raw.hq ?? '').toLowerCase().trim(),
  ];
  const normalized = keyParts.join('|');
  return createHash('sha256').update(normalized).digest('hex').substring(0, 32);
}

function getKeyNameHq(raw: KkrRawCompany): string {
  return `${raw.name.toLowerCase().trim()}|${(raw.hq ?? '').toLowerCase().trim()}`;
}

// Alternative: name + logo path
function generateIdNameLogo(raw: KkrRawCompany): string {
  const logoPath = raw.logo ?? '';
  const keyParts = [raw.name.toLowerCase().trim(), logoPath.toLowerCase()];
  const normalized = keyParts.join('|');
  return createHash('sha256').update(normalized).digest('hex').substring(0, 32);
}

function getKeyNameLogo(raw: KkrRawCompany): string {
  return `${raw.name.toLowerCase().trim()}|${raw.logo ?? 'NO_LOGO'}`;
}

// Alternative: name + url (website)
function generateIdNameUrl(raw: KkrRawCompany): string {
  const url = raw.url ?? '';
  const keyParts = [raw.name.toLowerCase().trim(), url.toLowerCase()];
  const normalized = keyParts.join('|');
  return createHash('sha256').update(normalized).digest('hex').substring(0, 32);
}

function getKeyNameUrl(raw: KkrRawCompany): string {
  return `${raw.name.toLowerCase().trim()}|${raw.url ?? 'NO_URL'}`;
}

// Alternative: logo only
function generateIdLogoOnly(raw: KkrRawCompany): string {
  const logoPath = raw.logo ?? raw.name;
  return createHash('sha256')
    .update(logoPath.toLowerCase())
    .digest('hex')
    .substring(0, 32);
}

function getKeyLogoOnly(raw: KkrRawCompany): string {
  return raw.logo ?? 'NO_LOGO';
}

// Alternative: name + logo + hq (composite)
function generateIdComposite(raw: KkrRawCompany): string {
  const keyParts = [
    raw.name.toLowerCase().trim(),
    (raw.logo ?? '').toLowerCase(),
    (raw.hq ?? '').toLowerCase().trim(),
  ];
  const normalized = keyParts.join('|');
  return createHash('sha256').update(normalized).digest('hex').substring(0, 32);
}

function getKeyComposite(raw: KkrRawCompany): string {
  return `${raw.name.toLowerCase().trim()}|${raw.logo ?? 'NO_LOGO'}|${(raw.hq ?? '').toLowerCase().trim()}`;
}

interface CollisionAnalysis {
  uniqueCount: number;
  collisions: Map<string, KkrRawCompany[]>;
}

function analyzeCollisions(
  companies: KkrRawCompany[],
  idFn: (raw: KkrRawCompany) => string,
): CollisionAnalysis {
  const map = new Map<string, KkrRawCompany[]>();

  for (const raw of companies) {
    const id = idFn(raw);
    if (!map.has(id)) {
      map.set(id, []);
    }
    map.get(id)!.push(raw);
  }

  const collisions = new Map<string, KkrRawCompany[]>();
  for (const [id, items] of map) {
    if (items.length > 1) {
      collisions.set(id, items);
    }
  }

  return { uniqueCount: map.size, collisions };
}

function printCollisionReport(
  strategyName: string,
  totalFetched: number,
  analysis: CollisionAnalysis,
  keyFn: (raw: KkrRawCompany) => string,
) {
  const { uniqueCount, collisions } = analysis;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`STRATEGY: ${strategyName}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Total fetched:    ${totalFetched}`);
  console.log(`Unique IDs:       ${uniqueCount}`);
  console.log(`Collision groups: ${collisions.size}`);
  console.log(
    `Collapse rate:    ${(((totalFetched - uniqueCount) / totalFetched) * 100).toFixed(1)}%`,
  );

  if (collisions.size > 0) {
    console.log(`\nTop ${Math.min(20, collisions.size)} collision groups:\n`);

    // Sort by number of collisions (descending)
    const sorted = [...collisions.entries()].sort(
      (a, b) => b[1].length - a[1].length,
    );

    let shown = 0;
    for (const [, items] of sorted) {
      if (shown >= 20) break;
      shown++;

      console.log(`${shown}. Key: "${keyFn(items[0])}" (${items.length} items)`);
      for (const item of items) {
        console.log(`   - name: "${item.name}"`);
        console.log(`     hq: "${item.hq ?? 'EMPTY'}"`);
        console.log(`     logo: "${item.logo?.substring(0, 60) ?? 'EMPTY'}"`);
        console.log(`     url: "${item.url ?? 'EMPTY'}"`);
        console.log(`     assetClass: "${item.assetClass ?? 'EMPTY'}"`);
        console.log(`     industry: "${item.industry ?? 'EMPTY'}"`);
      }
      console.log('');
    }
  }
}

async function main() {
  // Bootstrap NestJS to get KkrClient with proper configuration
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  const kkrClient = app.get(KkrClient);

  console.log('='.repeat(80));
  console.log('KKR Portfolio Company ID Collision Analysis');
  console.log('='.repeat(80));
  console.log('');

  console.log('Fetching all companies from KKR API...\n');
  const result = await kkrClient.fetchAllPages();
  const companies = result.companies;
  console.log(
    `Fetched ${companies.length} total companies (API reports ${result.totalHits})\n`,
  );

  // Define strategies to test
  const strategies = [
    { name: 'name + hq (CURRENT)', idFn: generateIdNameHq, keyFn: getKeyNameHq },
    { name: 'name + logo', idFn: generateIdNameLogo, keyFn: getKeyNameLogo },
    { name: 'name + url', idFn: generateIdNameUrl, keyFn: getKeyNameUrl },
    { name: 'logo only', idFn: generateIdLogoOnly, keyFn: getKeyLogoOnly },
    { name: 'name + logo + hq', idFn: generateIdComposite, keyFn: getKeyComposite },
  ];

  const results: { name: string; analysis: CollisionAnalysis }[] = [];

  for (const strategy of strategies) {
    const analysis = analyzeCollisions(companies, strategy.idFn);
    results.push({ name: strategy.name, analysis });
    printCollisionReport(strategy.name, companies.length, analysis, strategy.keyFn);
  }

  // Summary comparison
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY COMPARISON');
  console.log('='.repeat(80));
  console.log(
    `${'Strategy'.padEnd(25)} | ${'Unique'.padStart(8)} | ${'Collisions'.padStart(10)} | ${'Collapse %'.padStart(10)}`,
  );
  console.log('-'.repeat(60));

  for (const r of results) {
    const collapse = (
      ((companies.length - r.analysis.uniqueCount) / companies.length) *
      100
    ).toFixed(1);
    console.log(
      `${r.name.padEnd(25)} | ${String(r.analysis.uniqueCount).padStart(8)} | ${String(r.analysis.collisions.size).padStart(10)} | ${collapse.padStart(9)}%`,
    );
  }

  console.log('');

  await app.close();
}

main().catch(console.error);
