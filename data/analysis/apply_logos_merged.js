const fs = require('fs');
const path = require('path');

// Load data
const events = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'enriched', 'events_official_merged.json'), 'utf8')
);
const exhibitors = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'raw', 'expolist.json'), 'utf8')
);

console.log(`Events: ${events.length}, Exhibitors: ${exhibitors.length}`);

// Build exhibitor lookup: normalized name → logo_url
const exhibitorMap = new Map();
exhibitors.forEach(ex => {
  const name = (ex.name || '').trim();
  if (name && ex.logo_url) {
    exhibitorMap.set(name.toLowerCase(), { original: name, logo_url: ex.logo_url });
  }
});

console.log(`Exhibitor map entries: ${exhibitorMap.size}`);

// Extract companies from speaker strings
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
        if (possibleCompany.length > 2 && possibleCompany.length < 80 && !isTitle) {
          companies.push(possibleCompany);
        }
      }
    });
  }
  // Keynote titles
  if (title && title.toLowerCase().includes('keynote')) {
    const match = title.match(/keynote\s+session\s*:?\s*(.+)/i);
    if (match) {
      const parts = match[1].split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const last = parts[parts.length - 1];
        const titleWords = ['ceo', 'cto', 'founder', 'director', 'head', 'president'];
        if (last.length > 2 && !titleWords.some(w => last.toLowerCase().includes(w))) {
          companies.push(last);
        }
      }
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

  // Exact match
  if (exhibitorMap.has(normalized)) return exhibitorMap.get(normalized).logo_url;

  // Fuzzy match
  for (const [exhibitorKey, exhibitorData] of exhibitorMap.entries()) {
    const normalizedFirstWord = normalized.split(/\s+/)[0];
    const exhibitorFirstWord = exhibitorKey.split(/\s+/)[0];
    if (normalizedFirstWord.length >= 4 && normalizedFirstWord === exhibitorFirstWord) {
      return exhibitorData.logo_url;
    }
    const shorter = normalized.length < exhibitorKey.length ? normalized : exhibitorKey;
    const longer = normalized.length < exhibitorKey.length ? exhibitorKey : normalized;
    if (shorter.length >= 4) {
      if (longer.startsWith(shorter + ' ') || longer === shorter ||
          longer.includes(' ' + shorter + ' ') || longer.endsWith(' ' + shorter)) {
        return exhibitorData.logo_url;
      }
    }
  }
  return null;
}

// Process all events
let matched = 0;
let noMatch = 0;
let multiLogo = 0;

for (const event of events) {
  const logoUrls = [];

  // Speaker companies
  const speakerCompanies = extractSpeakerCompanies(event.speakers, event.title);
  speakerCompanies.forEach(company => {
    const url = findLogoUrl(company);
    if (url && !logoUrls.includes(url)) logoUrls.push(url);
  });

  // Knowledge partners
  const partners = extractKnowledgePartners(event.knowledge_partners);
  partners.forEach(partner => {
    const url = findLogoUrl(partner);
    if (url && !logoUrls.includes(url)) logoUrls.push(url);
  });

  event.logo_urls = logoUrls;
  if (logoUrls.length > 0) matched++;
  else noMatch++;
  if (logoUrls.length > 1) multiLogo++;
}

console.log(`\nLogo matching results:`);
console.log(`  With logos: ${matched}`);
console.log(`  No logos: ${noMatch}`);
console.log(`  Multi-logo: ${multiLogo}`);

// Save
const outPath = path.join(__dirname, '..', 'enriched', 'events_official_merged.json');
fs.writeFileSync(outPath, JSON.stringify(events, null, 2));
console.log(`\nUpdated: ${outPath}`);
