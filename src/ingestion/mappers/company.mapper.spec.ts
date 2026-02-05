import {
  generateCompanyId,
  stripHtml,
  normalizeUrl,
  buildLogoUrl,
  splitAssetClasses,
  mapRawToCompanyDto,
} from './company.mapper';
import { KkrRawCompany } from '../kkr-client/kkr-api.types';

describe('Company Mapper', () => {
  describe('generateCompanyId', () => {
    it('should generate consistent hash for same input', () => {
      const raw: KkrRawCompany = {
        name: 'Acme Corp',
        sortingName: 'acme corp',
        logo: '/logo.png',
        hq: 'New York',
        region: 'Americas',
        assetClass: 'Private Equity',
        industry: 'Technology',
        yoi: '2020',
        url: 'https://acme.com',
        description: '<p>Test company</p>',
      };

      const id1 = generateCompanyId(raw);
      const id2 = generateCompanyId(raw);

      expect(id1).toBe(id2);
      expect(id1).toHaveLength(32);
    });

    it('should generate different hashes for different companies', () => {
      const raw1: KkrRawCompany = {
        name: 'Acme Corp',
        sortingName: 'acme corp',
        logo: '',
        hq: 'New York',
        region: 'Americas',
        assetClass: 'Private Equity',
        industry: 'Technology',
        yoi: '2020',
        url: '',
        description: '',
      };

      const raw2: KkrRawCompany = {
        ...raw1,
        name: 'Different Corp',
      };

      expect(generateCompanyId(raw1)).not.toBe(generateCompanyId(raw2));
    });

    it('should be case-insensitive for name and hq', () => {
      const raw1: KkrRawCompany = {
        name: 'ACME CORP',
        sortingName: 'acme corp',
        logo: '',
        hq: 'NEW YORK',
        region: 'Americas',
        assetClass: 'Private Equity',
        industry: 'Technology',
        yoi: '2020',
        url: '',
        description: '',
      };

      const raw2: KkrRawCompany = {
        ...raw1,
        name: 'acme corp',
        hq: 'new york',
      };

      expect(generateCompanyId(raw1)).toBe(generateCompanyId(raw2));
    });
  });

  describe('stripHtml', () => {
    it('should return undefined for undefined input', () => {
      expect(stripHtml(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(stripHtml('')).toBeUndefined();
    });

    it('should strip HTML tags', () => {
      expect(stripHtml('<p>Hello World</p>')).toBe('Hello World');
    });

    it('should handle nested tags', () => {
      expect(stripHtml('<div><p><strong>Bold</strong> text</p></div>')).toBe(
        'Bold text',
      );
    });

    it('should decode HTML entities', () => {
      expect(stripHtml('Tom &amp; Jerry')).toBe('Tom & Jerry');
      expect(stripHtml('&lt;script&gt;')).toBe('<script>');
      expect(stripHtml('&quot;quoted&quot;')).toBe('"quoted"');
      expect(stripHtml('non&nbsp;breaking')).toBe('non breaking');
    });

    it('should collapse multiple whitespace', () => {
      expect(stripHtml('<p>Hello</p>\n\n<p>World</p>')).toBe('Hello World');
    });

    it('should trim result', () => {
      expect(stripHtml('  <p>  Padded  </p>  ')).toBe('Padded');
    });
  });

  describe('normalizeUrl', () => {
    it('should return undefined for undefined input', () => {
      expect(normalizeUrl(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(normalizeUrl('')).toBeUndefined();
      expect(normalizeUrl('   ')).toBeUndefined();
    });

    it('should preserve https:// URLs', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should preserve http:// URLs', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should add https:// to URLs without protocol', () => {
      expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
      expect(normalizeUrl('example.com')).toBe('https://example.com');
    });

    it('should trim whitespace', () => {
      expect(normalizeUrl('  https://example.com  ')).toBe(
        'https://example.com',
      );
    });
  });

  describe('buildLogoUrl', () => {
    it('should return undefined for undefined input', () => {
      expect(buildLogoUrl(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(buildLogoUrl('')).toBeUndefined();
      expect(buildLogoUrl('   ')).toBeUndefined();
    });

    it('should prefix with KKR base URL', () => {
      expect(buildLogoUrl('/content/dam/kkr/logo.png')).toBe(
        'https://www.kkr.com/content/dam/kkr/logo.png',
      );
    });
  });

  describe('splitAssetClasses', () => {
    it('should return empty array for empty input', () => {
      expect(splitAssetClasses('')).toEqual([]);
    });

    it('should split single value', () => {
      expect(splitAssetClasses('Private Equity')).toEqual(['Private Equity']);
    });

    it('should split multiple values', () => {
      expect(splitAssetClasses('Private Equity, Infrastructure')).toEqual([
        'Private Equity',
        'Infrastructure',
      ]);
    });

    it('should trim values', () => {
      expect(splitAssetClasses('  Private Equity  ,  Tech Growth  ')).toEqual([
        'Private Equity',
        'Tech Growth',
      ]);
    });

    it('should filter empty values', () => {
      expect(splitAssetClasses('Private Equity,,Tech Growth,')).toEqual([
        'Private Equity',
        'Tech Growth',
      ]);
    });
  });

  describe('mapRawToCompanyDto', () => {
    const mockRaw: KkrRawCompany = {
      name: 'Test Company',
      sortingName: 'test company',
      logo: '/content/dam/kkr/test-logo.png',
      hq: 'San Francisco, CA',
      region: 'Americas',
      assetClass: 'Private Equity, Tech Growth',
      industry: 'Technology',
      yoi: '2023',
      url: 'www.testcompany.com',
      description: '<p>A test company description.</p>',
      relatedLinkOne: '/news/press-release',
      relatedLinkOneTitle: 'Press Release',
    };

    it('should map all required fields', () => {
      const dto = mapRawToCompanyDto(
        mockRaw,
        'https://api.kkr.com/portfolio',
        'https://www.kkr.com/invest/portfolio',
      );

      expect(dto.companyId).toHaveLength(32);
      expect(dto.name).toBe('Test Company');
      expect(dto.nameSort).toBe('test company');
      expect(dto.assetClassRaw).toBe('Private Equity, Tech Growth');
      expect(dto.assetClasses).toEqual(['Private Equity', 'Tech Growth']);
      expect(dto.industry).toBe('Technology');
      expect(dto.region).toBe('Americas');
    });

    it('should normalize optional fields', () => {
      const dto = mapRawToCompanyDto(
        mockRaw,
        'https://api.kkr.com/portfolio',
        'https://www.kkr.com/invest/portfolio',
      );

      expect(dto.descriptionHtml).toBe('<p>A test company description.</p>');
      expect(dto.descriptionText).toBe('A test company description.');
      expect(dto.website).toBe('https://www.testcompany.com');
      expect(dto.headquarters).toBe('San Francisco, CA');
      expect(dto.yearOfInvestment).toBe('2023');
      expect(dto.logoPath).toBe('/content/dam/kkr/test-logo.png');
      expect(dto.logoUrl).toBe(
        'https://www.kkr.com/content/dam/kkr/test-logo.png',
      );
    });

    it('should map related links when present', () => {
      const dto = mapRawToCompanyDto(
        mockRaw,
        'https://api.kkr.com/portfolio',
        'https://www.kkr.com/invest/portfolio',
      );

      expect(dto.relatedLinks).toBeDefined();
      expect(dto.relatedLinks?.linkOne?.url).toBe('/news/press-release');
      expect(dto.relatedLinks?.linkOne?.title).toBe('Press Release');
    });

    it('should include source metadata', () => {
      const dto = mapRawToCompanyDto(
        mockRaw,
        'https://api.kkr.com/portfolio',
        'https://www.kkr.com/invest/portfolio',
      );

      expect(dto.source.endpoint).toBe('https://api.kkr.com/portfolio');
      expect(dto.source.listUrl).toBe('https://www.kkr.com/invest/portfolio');
      expect(dto.source.fetchedAt).toBeInstanceOf(Date);
    });

    it('should handle missing optional fields', () => {
      const minimalRaw: KkrRawCompany = {
        name: 'Minimal Company',
        sortingName: 'minimal company',
        logo: '',
        hq: '',
        region: 'Americas',
        assetClass: 'Private Equity',
        industry: 'Technology',
        yoi: '',
        url: '',
        description: '',
      };

      const dto = mapRawToCompanyDto(
        minimalRaw,
        'https://api.kkr.com/portfolio',
        'https://www.kkr.com/invest/portfolio',
      );

      expect(dto.descriptionHtml).toBeUndefined();
      expect(dto.descriptionText).toBeUndefined();
      expect(dto.website).toBeUndefined();
      expect(dto.headquarters).toBeUndefined();
      expect(dto.yearOfInvestment).toBeUndefined();
      expect(dto.logoPath).toBeUndefined();
      expect(dto.logoUrl).toBeUndefined();
      expect(dto.relatedLinks).toBeUndefined();
    });
  });
});
