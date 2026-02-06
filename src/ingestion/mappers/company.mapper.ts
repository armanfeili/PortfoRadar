import { createHash } from 'crypto';
import { KkrRawCompany } from '../kkr-client/kkr-api.types';
import { UpsertCompanyDto } from '../../companies/companies.repository';

/**
 * Generate a deterministic company ID from stable fields.
 *
 * The KKR API does NOT provide unique IDs, so we create one
 * by hashing stable identifying fields.
 *
 * Strategy:
 * - Use: name + headquarters (hq)
 * - These fields are always present and together uniquely identify a company
 * - Even when companies share logos (e.g., ON*NET Fibra Chile vs Colombia),
 *   they have different headquarters
 *
 * Previously tried approaches that failed:
 * 1. name + yoi + hq + assetClass + industry - too many variable fields
 * 2. logo path alone - some companies share logos (ON*NET Fibra Chile/Colombia)
 */
export function generateCompanyId(raw: KkrRawCompany): string {
  // Use name + hq as the stable composite key
  // Both are required fields and together are unique per company
  const keyParts = [
    raw.name.toLowerCase().trim(),
    (raw.hq ?? '').toLowerCase().trim(),
  ];

  const normalized = keyParts.join('|');
  return createHash('sha256').update(normalized).digest('hex').substring(0, 32);
}

/**
 * Debug helper: Generate the raw key used for company ID (before hashing).
 * Useful for identifying which fields caused a collision.
 */
export function getCompanyIdKey(raw: KkrRawCompany): string {
  return `${raw.name.toLowerCase().trim()}|${(raw.hq ?? '').toLowerCase().trim()}`;
}

/**
 * Strip HTML tags from a string.
 * Simple implementation — sufficient for the description field.
 */
export function stripHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp;
    .replace(/&amp;/g, '&') // Replace &amp;
    .replace(/&lt;/g, '<') // Replace &lt;
    .replace(/&gt;/g, '>') // Replace &gt;
    .replace(/&quot;/g, '"') // Replace &quot;
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/**
 * Normalize a URL to include https:// if missing.
 */
export function normalizeUrl(url: string | undefined): string | undefined {
  if (!url || url.trim() === '') return undefined;

  const trimmed = url.trim();

  // Already has protocol
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Add https://
  return `https://${trimmed}`;
}

/**
 * Build full logo URL from relative path.
 */
export function buildLogoUrl(logoPath: string | undefined): string | undefined {
  if (!logoPath || logoPath.trim() === '') return undefined;
  return `https://www.kkr.com${logoPath}`;
}

/**
 * Split comma-separated asset classes into array.
 */
export function splitAssetClasses(assetClassRaw: string): string[] {
  if (!assetClassRaw) return [];
  return assetClassRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Generate a content hash from all business fields.
 * Used to detect if a company's data has actually changed.
 *
 * Excludes volatile fields: source.fetchedAt, createdAt, updatedAt
 */
export function generateContentHash(raw: KkrRawCompany): string {
  // Include all fields that represent business data
  const content = JSON.stringify({
    name: raw.name,
    assetClass: raw.assetClass,
    industry: raw.industry,
    region: raw.region,
    description: raw.description || '',
    url: raw.url || '',
    hq: raw.hq || '',
    yoi: raw.yoi || '',
    logo: raw.logo || '',
    relatedLinkOne: raw.relatedLinkOne || '',
    relatedLinkOneTitle: raw.relatedLinkOneTitle || '',
    relatedLinkTwo: raw.relatedLinkTwo || '',
    relatedLinkTwoTitle: raw.relatedLinkTwoTitle || '',
  });

  return createHash('sha256').update(content).digest('hex').substring(0, 32);
}

/**
 * Map a raw KKR API company to our UpsertCompanyDto.
 *
 * Handles:
 * - Generating deterministic companyId
 * - Computing derived fields (assetClasses[], nameSort, descriptionText, etc.)
 * - Normalizing URLs
 * - Building full logo URL
 * - Safely handling optional related links
 */
export function mapRawToCompanyDto(
  raw: KkrRawCompany,
  sourceEndpoint: string,
  listUrl: string,
): UpsertCompanyDto {
  const companyId = generateCompanyId(raw);
  const contentHash = generateContentHash(raw);

  // Build related links if present
  const relatedLinks =
    raw.relatedLinkOne || raw.relatedLinkTwo
      ? {
          linkOne:
            raw.relatedLinkOne || raw.relatedLinkOneTitle
              ? {
                  url: raw.relatedLinkOne,
                  title: raw.relatedLinkOneTitle,
                }
              : undefined,
          linkTwo:
            raw.relatedLinkTwo || raw.relatedLinkTwoTitle
              ? {
                  url: raw.relatedLinkTwo,
                  title: raw.relatedLinkTwoTitle,
                }
              : undefined,
        }
      : undefined;

  return {
    companyId,
    contentHash,
    name: raw.name,
    nameSort: raw.name.toLowerCase(),
    assetClassRaw: raw.assetClass,
    assetClasses: splitAssetClasses(raw.assetClass),
    industry: raw.industry,
    region: raw.region, // Single string per API

    // Optional fields
    descriptionHtml: raw.description || undefined,
    descriptionText: stripHtml(raw.description),
    website: normalizeUrl(raw.url),
    headquarters: raw.hq || undefined,
    yearOfInvestment: raw.yoi || undefined,
    logoPath: raw.logo || undefined,
    logoUrl: buildLogoUrl(raw.logo),
    relatedLinks,

    // Source metadata
    source: {
      listUrl,
      endpoint: sourceEndpoint,
      fetchedAt: new Date(),
    },
  };
}
