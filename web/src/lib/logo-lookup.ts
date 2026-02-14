/**
 * Runtime logo enrichment: cross-references speaker/knowledge_partner company names
 * against the exhibitors database to find matching logos.
 *
 * The enrichment script only captured ~1 logo per event. This fills the gap.
 */

import exhibitorsData from '@/data/exhibitors.json';

interface ExhibitorEntry {
  name: string;
  logo_url: string;
}

// Words that are too generic to use as matching tokens
const SKIP_WORDS = new Set([
  'the', 'and', 'of', 'for', 'in', 'pvt', 'ltd', 'llp', 'private', 'limited',
  'india', 'government', 'ministry', 'department', 'corporation', 'solutions',
  'technologies', 'technology', 'services', 'development', 'state', 'digital',
  'national', 'centre', 'center', 'institute', 'foundation', 'council', 'bureau',
  'enterprise', 'enterprises', 'group', 'systems', 'international', 'trade',
  'agency', 'embassy', 'society', 'mission', 'design', 'arena', 'data',
  'information', 'communication', 'communications', 'electronic', 'electronics',
  'software', 'export', 'promotion', 'event', 'marketing', 'developers',
]);

// Known aliases: company name variants → exhibitor name (for matching)
const COMPANY_ALIASES: Record<string, string> = {
  'bharti': 'airtel',
  'bharti enterprises': 'airtel',
  'tcs': 'tata consultancy services',
  'jio': 'jio intelligence',
  'reliance': 'jio intelligence',
  'aws': 'aws/amazon',
  'amazon': 'aws/amazon',
  'openai': 'open ai',
  'open ai': 'open ai',
  'dell': 'dell technologies',
  'deloitte': 'deloitte touche tohmatsu india llp (dttillp)',
  'ernst & young': 'ernst & young llp (ey)',
  'hp': 'hp india sales pvt. ltd.',
  'hcl': 'hclsoftware',
};

// Build primary lookup: exhibitor name (lowercased) → logo URL
const NAME_TO_LOGO = new Map<string, string>();
for (const ex of exhibitorsData as ExhibitorEntry[]) {
  if (!ex.logo_url) continue;
  NAME_TO_LOGO.set(ex.name.toLowerCase().trim(), ex.logo_url);
}

// Build word-boundary regex patterns for matching
// Only use distinctive brand names (5+ chars, not in skip list)
const BRAND_PATTERNS: { regex: RegExp; logoUrl: string }[] = [];

for (const ex of exhibitorsData as ExhibitorEntry[]) {
  if (!ex.logo_url) continue;

  // Extract meaningful brand tokens from the exhibitor name
  const cleanName = ex.name.replace(/\(.*?\)/g, '').trim();
  const tokens = cleanName
    .split(/[\s,/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !SKIP_WORDS.has(t.toLowerCase()));

  // Use the first distinctive token as the brand name
  // (e.g., "Google" from "Google India", "Adobe" from "Adobe")
  if (tokens.length > 0) {
    const brand = tokens[0];
    // Word-boundary match to avoid substring false positives
    const regex = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    BRAND_PATTERNS.push({ regex, logoUrl: ex.logo_url });
  }
}

// Build alias lookup
const ALIAS_TO_LOGO = new Map<string, string>();
for (const [alias, exhibitorName] of Object.entries(COMPANY_ALIASES)) {
  const logo = NAME_TO_LOGO.get(exhibitorName.toLowerCase());
  if (logo) {
    ALIAS_TO_LOGO.set(alias.toLowerCase(), logo);
  }
}

/**
 * Given an event's speakers string, knowledge_partners string, and existing logo_urls,
 * returns a deduplicated array of all matching logo URLs.
 */
export function getEnrichedLogos(
  speakers: string,
  knowledgePartners: string,
  existingLogos: string[],
): string[] {
  const seen = new Set(existingLogos);
  const result = [...existingLogos];
  const searchText = `${speakers} ${knowledgePartners}`;

  function addLogo(url: string) {
    if (!seen.has(url)) {
      seen.add(url);
      result.push(url);
    }
  }

  // 1. Check aliases first (handles Bharti→Airtel, etc.)
  const searchLower = searchText.toLowerCase();
  for (const [alias, logoUrl] of ALIAS_TO_LOGO) {
    if (searchLower.includes(alias)) {
      addLogo(logoUrl);
    }
  }

  // 2. Check brand name patterns (word-boundary matching)
  for (const { regex, logoUrl } of BRAND_PATTERNS) {
    if (regex.test(searchText)) {
      addLogo(logoUrl);
    }
  }

  return result;
}
