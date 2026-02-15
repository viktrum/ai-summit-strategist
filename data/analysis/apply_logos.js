const fs = require('fs');
const path = require('path');

// Load data
const mergedPath = path.join(__dirname, '..', 'enriched', 'events_merged_v2.json');
const merged = JSON.parse(fs.readFileSync(mergedPath, 'utf8'));

// Load exhibitors for logo matching
const exhibitorsPath = path.join(__dirname, '..', 'production', 'exhibitors.json');
const exhibitors = JSON.parse(fs.readFileSync(exhibitorsPath, 'utf8'));

console.log(`Loaded ${merged.length} merged events and ${exhibitors.length} exhibitors`);

// Build exhibitor lookup map
const exhibitorMap = new Map();
exhibitors.forEach(ex => {
  const name = ex.name?.trim();
  if (name && ex.logo_url) {
    exhibitorMap.set(name.toLowerCase(), {
      original: name,
      logo_url: ex.logo_url,
    });
  }
});
console.log(`Built lookup map with ${exhibitorMap.size} exhibitors with logos`);

// Same helper functions as match_logos.js
function extractSpeakerCompanies(speakersStr, title) {
  const companies = [];

  if (speakersStr && speakersStr.trim() !== '') {
    const speakers = speakersStr.split(';').map(s => s.trim());
    speakers.forEach(speaker => {
      const parts = speaker.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const possibleCompany = parts[parts.length - 1];
        const titleWords = ['ceo', 'cto', 'founder', 'director', 'head', 'president', 'minister', 'secretary', 'chair', 'chief'];
        const isTitle = titleWords.some(w => possibleCompany.toLowerCase().includes(w));
        if (!isTitle && possibleCompany.length > 2) {
          companies.push(possibleCompany);
        }
      }
    });
  }

  if (title && title.toLowerCase().includes('keynote')) {
    const match = title.match(/keynote\s+session\s*:?\s*(.+)/i);
    if (match) {
      const content = match[1].trim();
      const parts = content.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        const titleWords = ['ceo', 'cto', 'founder', 'director', 'head', 'president', 'minister', 'secretary', 'chair', 'chief', 'executive', 'officer'];
        const isTitle = titleWords.some(w => lastPart.toLowerCase().includes(w));
        if (!isTitle && lastPart.length > 2) {
          companies.push(lastPart);
        }
      }
    }
  }

  if (title && title.toLowerCase().includes('hosted by')) {
    const match = title.match(/hosted by\s+(.+?)(?:\)|$)/i);
    if (match) {
      companies.push(match[1].trim());
    }
  }

  return companies;
}

function extractKnowledgePartners(kpStr) {
  if (!kpStr || kpStr.trim() === '') return [];
  return kpStr.split(';').map(s => s.trim()).filter(s => s.length > 0);
}

function findLogoUrl(companyName) {
  if (!companyName) return null;
  const normalized = companyName.toLowerCase().trim();

  if (exhibitorMap.has(normalized)) {
    return exhibitorMap.get(normalized).logo_url;
  }

  for (const [exhibitorKey, exhibitorData] of exhibitorMap.entries()) {
    const normalizedFirstWord = normalized.split(/\s+/)[0];
    const exhibitorFirstWord = exhibitorKey.split(/\s+/)[0];
    if (normalizedFirstWord.length >= 4 && normalizedFirstWord === exhibitorFirstWord) {
      return exhibitorData.logo_url;
    }

    const shorter = normalized.length < exhibitorKey.length ? normalized : exhibitorKey;
    const longer = normalized.length < exhibitorKey.length ? exhibitorKey : normalized;
    if (shorter.length >= 4) {
      const wordBoundaryMatch =
        longer.startsWith(shorter + ' ') ||
        (longer.startsWith(shorter) && longer.length === shorter.length) ||
        longer.includes(' ' + shorter + ' ') ||
        longer.endsWith(' ' + shorter);
      if (wordBoundaryMatch) {
        return exhibitorData.logo_url;
      }
    }
  }

  return null;
}

// Apply logo matching to xlsx_only events
let logosAdded = 0;
let xlsxOnlyCount = 0;

for (const event of merged) {
  if (event.source !== 'xlsx_only') continue;
  xlsxOnlyCount++;

  if (!event.logo_urls) event.logo_urls = [];

  const logoUrls = [];

  // Extract companies from speakers
  const speakersStr = event.speakers || (event.xlsx_speakers ? event.xlsx_speakers.join('; ') : '');
  const speakerCompanies = extractSpeakerCompanies(speakersStr, event.title);

  speakerCompanies.forEach(company => {
    const logoUrl = findLogoUrl(company);
    if (logoUrl && !logoUrls.includes(logoUrl)) {
      logoUrls.push(logoUrl);
    }
  });

  // Knowledge partners
  const kpCompanies = extractKnowledgePartners(event.knowledge_partners);
  kpCompanies.forEach(partner => {
    const logoUrl = findLogoUrl(partner);
    if (logoUrl && !logoUrls.includes(logoUrl)) {
      logoUrls.push(logoUrl);
    }
  });

  // Also check "Hosted by" in title
  if (event.title) {
    const hostedMatch = event.title.match(/hosted by\s+(.+?)(?:\)|$)/i);
    if (hostedMatch) {
      const logoUrl = findLogoUrl(hostedMatch[1].trim());
      if (logoUrl && !logoUrls.includes(logoUrl)) {
        logoUrls.push(logoUrl);
      }
    }
  }

  if (logoUrls.length > 0) {
    event.logo_urls = logoUrls;
    logosAdded++;
  }
}

console.log(`\nLogo matching for xlsx_only events:`);
console.log(`  Total xlsx_only: ${xlsxOnlyCount}`);
console.log(`  Got logos: ${logosAdded}`);

// Write updated file
fs.writeFileSync(mergedPath, JSON.stringify(merged, null, 2));
console.log(`\nUpdated events_merged_v2.json`);

// Final stats
const stats = {
  total: merged.length,
  both: merged.filter(e => e.source === 'both').length,
  production_only: merged.filter(e => e.source === 'production_only').length,
  xlsx_only: merged.filter(e => e.source === 'xlsx_only').length,
  with_enrichment: merged.filter(e => e.summary_one_liner).length,
  with_logos: merged.filter(e => e.logo_urls && e.logo_urls.length > 0).length,
  with_end_time: merged.filter(e => e.end_time).length,
};
console.log('\nFinal merged file stats:');
console.log(JSON.stringify(stats, null, 2));
