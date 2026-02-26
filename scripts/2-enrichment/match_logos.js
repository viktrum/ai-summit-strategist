const fs = require('fs');

// Load data
const events = JSON.parse(fs.readFileSync('sessions_enriched_v2.json', 'utf8'));
const exhibitors = JSON.parse(fs.readFileSync('expolist_enriched.json', 'utf8'));

console.log(`Loaded ${events.length} events and ${exhibitors.length} exhibitors`);

// Build exhibitor lookup map: company name (normalized) -> logo_url
const exhibitorMap = new Map();
exhibitors.forEach(ex => {
  const name = ex.name?.trim();
  if (name && ex.logo_url) {
    const normalized = name.toLowerCase();
    exhibitorMap.set(normalized, {
      original: name,
      logo_url: ex.logo_url
    });
  }
});

console.log(`Built lookup map with ${exhibitorMap.size} exhibitors with logos`);

// Helper: Extract company from speaker string
// Format: "Name, Title, Company" or "Name, Company"
function extractSpeakerCompanies(speakersStr, title = '') {
  const companies = [];

  // STRATEGY 1: Parse speakers field
  if (speakersStr && speakersStr.trim() !== '') {
    const speakers = speakersStr.split(';').map(s => s.trim());

    speakers.forEach(speaker => {
      const parts = speaker.split(',').map(p => p.trim());
      // Company is usually the last part after comma
      if (parts.length >= 2) {
        const possibleCompany = parts[parts.length - 1];
        // Skip if it looks like a title (contains common title words)
        const titleWords = ['ceo', 'cto', 'founder', 'director', 'head', 'president', 'minister', 'secretary', 'chair', 'chief'];
        const isTitle = titleWords.some(w => possibleCompany.toLowerCase().includes(w));
        if (!isTitle && possibleCompany.length > 2) {
          companies.push(possibleCompany);
        }
      }
    });
  }

  // STRATEGY 2: Parse title for "Keynote Session : Name, Title, Company" format
  if (title.toLowerCase().includes('keynote')) {
    // Extract content after "Keynote Session :" or "Keynote Session:"
    const match = title.match(/keynote\s+session\s*:?\s*(.+)/i);
    if (match) {
      const content = match[1].trim();
      const parts = content.split(',').map(p => p.trim());

      // If we have at least 2 parts, last part is likely the company
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];

        // Skip if it's clearly a title
        const titleWords = ['ceo', 'cto', 'founder', 'director', 'head', 'president', 'minister', 'secretary', 'chair', 'chief', 'executive', 'officer'];
        const isTitle = titleWords.some(w => lastPart.toLowerCase().includes(w));

        if (!isTitle && lastPart.length > 2) {
          companies.push(lastPart);
        }
      }
    }
  }

  // STRATEGY 3: Parse title for "Fireside Chat" with speakers listed
  if (title.toLowerCase().includes('fireside')) {
    // Similar logic as keynote
    const parts = title.split(';').map(s => s.trim());
    parts.forEach(part => {
      const commaParts = part.split(',').map(p => p.trim());
      if (commaParts.length >= 2) {
        const lastPart = commaParts[commaParts.length - 1];
        const titleWords = ['ceo', 'cto', 'founder', 'director', 'head', 'president', 'minister', 'secretary', 'chair', 'chief', 'editor'];
        const isTitle = titleWords.some(w => lastPart.toLowerCase().includes(w));
        if (!isTitle && lastPart.length > 2) {
          companies.push(lastPart);
        }
      }
    });
  }

  return companies;
}

// Helper: Extract knowledge partners
function extractKnowledgePartners(kpStr) {
  if (!kpStr || kpStr.trim() === '') return [];
  return kpStr.split(';').map(s => s.trim()).filter(s => s.length > 0);
}

// Helper: Find logo by company name (exact first, then fuzzy)
function findLogoUrl(companyName) {
  if (!companyName) return null;

  const normalized = companyName.toLowerCase().trim();

  // STEP 1: Exact match
  if (exhibitorMap.has(normalized)) {
    return exhibitorMap.get(normalized).logo_url;
  }

  // STEP 2: Fuzzy match (only if no exact match)
  for (const [exhibitorKey, exhibitorData] of exhibitorMap.entries()) {
    // Strategy A: Match on first word (handles "Google India" vs "Google DeepMind")
    const normalizedFirstWord = normalized.split(/\s+/)[0];
    const exhibitorFirstWord = exhibitorKey.split(/\s+/)[0];

    if (normalizedFirstWord.length >= 4 && normalizedFirstWord === exhibitorFirstWord) {
      return exhibitorData.logo_url;
    }

    // Strategy B: Check if shorter string is contained in longer string
    // This catches "Qualcomm" in "Qualcomm India Pvt. Limited"
    const shorter = normalized.length < exhibitorKey.length ? normalized : exhibitorKey;
    const longer = normalized.length < exhibitorKey.length ? exhibitorKey : normalized;

    if (shorter.length >= 4) {
      // Check word boundary: shorter string should be at start, or preceded by space/punctuation
      const wordBoundaryMatch =
        longer.startsWith(shorter + ' ') ||  // "google " in "google india"
        longer.startsWith(shorter) && longer.length === shorter.length ||  // exact match
        longer.includes(' ' + shorter + ' ') ||  // " google " in middle
        longer.endsWith(' ' + shorter);  // ends with " google"

      if (wordBoundaryMatch) {
        return exhibitorData.logo_url;
      }
    }
  }

  return null;
}

// Process events
let heavyHitterMatches = 0;
let knowledgePartnerMatches = 0;
let multiLogoEvents = 0;
let noMatchEvents = 0;

const eventsWithLogos = events.map(event => {
  const logoUrls = [];
  const matchedCompanies = []; // For logging

  // PRIORITY 1: Heavy hitters - match speaker companies
  if (event.networking_signals?.is_heavy_hitter) {
    const speakerCompanies = extractSpeakerCompanies(event.speakers, event.title);

    speakerCompanies.forEach(company => {
      const logoUrl = findLogoUrl(company);
      if (logoUrl && !logoUrls.includes(logoUrl)) {
        logoUrls.push(logoUrl);
        matchedCompanies.push(`Speaker: ${company}`);
        heavyHitterMatches++;
      }
    });
  }

  // PRIORITY 2: Knowledge partners
  const knowledgePartners = extractKnowledgePartners(event.knowledge_partners);

  knowledgePartners.forEach(partner => {
    const logoUrl = findLogoUrl(partner);
    if (logoUrl && !logoUrls.includes(logoUrl)) {
      logoUrls.push(logoUrl);
      matchedCompanies.push(`Partner: ${partner}`);
      knowledgePartnerMatches++;
    }
  });

  // Stats tracking
  if (logoUrls.length > 1) multiLogoEvents++;
  if (logoUrls.length === 0) noMatchEvents++;

  // Log matches for first 10 heavy hitters (for verification)
  if (event.networking_signals?.is_heavy_hitter && heavyHitterMatches <= 10) {
    console.log(`✓ Heavy Hitter: "${event.title}"`);
    console.log(`  Matched: ${matchedCompanies.join(', ') || 'None'}`);
    console.log(`  Logos: ${logoUrls.length}`);
  }

  return {
    ...event,
    logo_urls: logoUrls
  };
});

// Summary stats
console.log('\n--- Logo Matching Results ---');
console.log(`Heavy hitter matches: ${heavyHitterMatches}`);
console.log(`Knowledge partner matches: ${knowledgePartnerMatches}`);
console.log(`Events with multiple logos: ${multiLogoEvents}`);
console.log(`Events with no logos: ${noMatchEvents}`);
console.log(`Events with at least 1 logo: ${events.length - noMatchEvents} (${((events.length - noMatchEvents) / events.length * 100).toFixed(1)}%)`);

// Sample of multi-logo events
const multiLogoSamples = eventsWithLogos
  .filter(e => e.logo_urls.length > 1)
  .slice(0, 5);

if (multiLogoSamples.length > 0) {
  console.log('\n--- Sample Multi-Logo Events ---');
  multiLogoSamples.forEach(e => {
    console.log(`"${e.title}" - ${e.logo_urls.length} logos`);
  });
}

// Write output
fs.writeFileSync(
  'sessions_with_logos.json',
  JSON.stringify(eventsWithLogos, null, 2)
);

console.log('\n✅ Written to sessions_with_logos.json');
