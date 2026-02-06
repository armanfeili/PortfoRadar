/**
 * Script to diagnose ID stability issues
 *
 * Fetches data twice and compares the raw fields used for ID generation.
 * Helps identify which fields are changing between API calls.
 *
 * Usage: npx ts-node src/scripts/diagnose-id-stability.ts
 */

import { NestFactory } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { AppModule } from '../app.module';
import { KkrClient } from '../ingestion/kkr-client/kkr.client';
import { KkrRawCompany } from '../ingestion/kkr-client/kkr-api.types';

function generateCompanyId(raw: KkrRawCompany): string {
  const keyParts = [
    raw.name.toLowerCase().trim(),
    (raw.hq ?? '').toLowerCase().trim(),
  ];
  const normalized = keyParts.join('|');
  return createHash('sha256').update(normalized).digest('hex').substring(0, 32);
}

function getKey(raw: KkrRawCompany): string {
  return `${raw.name.toLowerCase().trim()}|${(raw.hq ?? '').toLowerCase().trim()}`;
}

interface CompanySnapshot {
  name: string;
  hq: string;
  logo: string;
  url: string;
  key: string;
  id: string;
}

function toSnapshot(raw: KkrRawCompany): CompanySnapshot {
  return {
    name: raw.name,
    hq: raw.hq ?? '',
    logo: raw.logo ?? '',
    url: raw.url ?? '',
    key: getKey(raw),
    id: generateCompanyId(raw),
  };
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  const kkrClient = app.get(KkrClient);

  console.log('='.repeat(80));
  console.log('ID Stability Diagnostic');
  console.log('='.repeat(80));
  console.log('');

  // Fetch 1
  console.log('Fetch 1...');
  const result1 = await kkrClient.fetchAllPages();
  console.log(`  Got ${result1.companies.length} companies`);

  // Small delay
  await new Promise((r) => setTimeout(r, 2000));

  // Fetch 2
  console.log('Fetch 2...');
  const result2 = await kkrClient.fetchAllPages();
  console.log(`  Got ${result2.companies.length} companies`);

  // Convert to snapshots
  const snap1 = new Map<string, CompanySnapshot>();
  const snap2 = new Map<string, CompanySnapshot>();

  for (const raw of result1.companies) {
    const s = toSnapshot(raw);
    // Use name as the lookup key (stable across fetches)
    const nameKey = raw.name.toLowerCase().trim();
    if (!snap1.has(nameKey)) {
      snap1.set(nameKey, s);
    }
  }

  for (const raw of result2.companies) {
    const s = toSnapshot(raw);
    const nameKey = raw.name.toLowerCase().trim();
    if (!snap2.has(nameKey)) {
      snap2.set(nameKey, s);
    }
  }

  console.log(`\nFetch 1 unique by name: ${snap1.size}`);
  console.log(`Fetch 2 unique by name: ${snap2.size}`);

  // Find companies where HQ differs between fetches
  const hqDiffs: { name: string; hq1: string; hq2: string }[] = [];
  const idDiffs: {
    name: string;
    id1: string;
    id2: string;
    key1: string;
    key2: string;
  }[] = [];

  for (const [nameKey, s1] of snap1) {
    const s2 = snap2.get(nameKey);
    if (s2) {
      if (s1.hq !== s2.hq) {
        hqDiffs.push({ name: s1.name, hq1: s1.hq, hq2: s2.hq });
      }
      if (s1.id !== s2.id) {
        idDiffs.push({
          name: s1.name,
          id1: s1.id,
          id2: s2.id,
          key1: s1.key,
          key2: s2.key,
        });
      }
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('COMPANIES WITH DIFFERENT HQ BETWEEN FETCHES');
  console.log('='.repeat(80));

  if (hqDiffs.length === 0) {
    console.log('None found - HQ is stable!');
  } else {
    console.log(`Found ${hqDiffs.length} companies with HQ differences:\n`);
    for (const d of hqDiffs.slice(0, 20)) {
      console.log(`  "${d.name}"`);
      console.log(`    Fetch 1 HQ: "${d.hq1}"`);
      console.log(`    Fetch 2 HQ: "${d.hq2}"`);
      console.log('');
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('COMPANIES WITH DIFFERENT ID BETWEEN FETCHES');
  console.log('='.repeat(80));

  if (idDiffs.length === 0) {
    console.log('None found - IDs are stable!');
  } else {
    console.log(`Found ${idDiffs.length} companies with ID differences:\n`);
    for (const d of idDiffs.slice(0, 20)) {
      console.log(`  "${d.name}"`);
      console.log(`    Fetch 1: key="${d.key1}" id=${d.id1}`);
      console.log(`    Fetch 2: key="${d.key2}" id=${d.id2}`);
      console.log('');
    }
  }

  // Check for companies only in one fetch
  const onlyIn1: string[] = [];
  const onlyIn2: string[] = [];

  for (const nameKey of snap1.keys()) {
    if (!snap2.has(nameKey)) {
      onlyIn1.push(snap1.get(nameKey)!.name);
    }
  }

  for (const nameKey of snap2.keys()) {
    if (!snap1.has(nameKey)) {
      onlyIn2.push(snap2.get(nameKey)!.name);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('COMPANIES ONLY IN ONE FETCH (CDN inconsistency)');
  console.log('='.repeat(80));
  console.log(`Only in fetch 1: ${onlyIn1.length}`);
  console.log(`Only in fetch 2: ${onlyIn2.length}`);

  if (onlyIn1.length > 0) {
    console.log('\nOnly in fetch 1:');
    for (const name of onlyIn1.slice(0, 10)) {
      console.log(`  - ${name}`);
    }
    if (onlyIn1.length > 10)
      console.log(`  ... and ${onlyIn1.length - 10} more`);
  }

  if (onlyIn2.length > 0) {
    console.log('\nOnly in fetch 2:');
    for (const name of onlyIn2.slice(0, 10)) {
      console.log(`  - ${name}`);
    }
    if (onlyIn2.length > 10)
      console.log(`  ... and ${onlyIn2.length - 10} more`);
  }

  await app.close();
}

main().catch(console.error);
