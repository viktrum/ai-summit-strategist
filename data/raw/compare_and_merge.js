const fs = require('fs');
const path = require('path');

// ─── LOAD DATA ──────────────────────────────────────────────
const xlsxParsed = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'xlsx_parsed.json'), 'utf8')
);
const productionEvents = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'production', 'events.json'), 'utf8')
);

console.log('Production events:', productionEvents.length);

// ─── PARSE XLSX INTO FLAT EVENT LIST ─────────────────────────
// The xlsx has sheets: "Founders Name ", "Day 16", "Day 17", "Day 18", "day 19", "day20"
// We only care about the Day sheets (events), not "Founders Name" (people list)

const dateMap = {
  'Day 16': '2026-02-16',
  'Day 17': '2026-02-17',
  'Day 18': '2026-02-18',
  'day 19': '2026-02-19',
  'day20': '2026-02-20',
};

// Excel serial date to ISO date
function excelDateToISO(serial) {
  if (typeof serial === 'string' && serial.includes('-')) return serial; // already date
  // Excel epoch: Jan 1, 1900 = 1 (with the famous Lotus 1-2-3 bug)
  // Must use UTC to avoid timezone offset issues
  const epoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899 UTC
  const d = new Date(epoch.getTime() + serial * 86400000);
  return d.toISOString().split('T')[0];
}

// Excel time fraction to time string
function excelTimeToString(val) {
  if (typeof val === 'string') return val; // already a string like "9:30 AM - 10:30 AM"
  if (typeof val === 'number' && val < 1) {
    // Fraction of day
    const totalMinutes = Math.round(val * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
  }
  return String(val);
}

// Parse time string like "9:30 AM - 10:30 AM" into { start_time, end_time }
function parseTimeRange(timeStr) {
  if (!timeStr) return { start_time: null, end_time: null };
  const str = String(timeStr).trim();

  // Handle "9:30 AM - 10:30 AM" format
  const rangeMatch = str.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  if (rangeMatch) {
    return {
      start_time: parseTimeTo24h(rangeMatch[1].trim(), rangeMatch[2].trim()),
      end_time: parseTimeTo24h(rangeMatch[2].trim(), null),
    };
  }

  // Single time
  return { start_time: parseTimeTo24h(str, null), end_time: null };
}

function parseTimeTo24h(timeStr, referenceStr) {
  if (!timeStr) return null;

  // If no AM/PM specified, try to infer from reference
  let str = timeStr.trim();
  let match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  let ampm = match[3] ? match[3].toUpperCase() : null;

  // Infer AM/PM from reference if missing
  if (!ampm && referenceStr) {
    const refMatch = referenceStr.match(/(AM|PM)/i);
    if (refMatch) ampm = refMatch[1].toUpperCase();
  }

  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000`;
}

const xlsxEvents = [];
let xlsxIdCounter = 0;

for (const [sheetName, sheetDate] of Object.entries(dateMap)) {
  const rows = xlsxParsed[sheetName] || [];

  for (const row of rows) {
    if (!row.Title || row.Title === 'Title') continue; // Skip header rows

    // Combine speaker columns
    const speakerCols = ['Name', 'name', 'name_1', 'name_2', 'name_3'];
    const speakers = speakerCols
      .map(col => row[col])
      .filter(v => v && String(v).trim() !== '' && String(v).trim() !== 'Speakers')
      .map(v => String(v).trim());

    // Combine description columns
    const descCols = ['Description', 'Description_1', 'Description_2', 'Description_3',
                      'Description_4', 'Description_5', 'Description_6', 'Description_7'];
    const descParts = descCols
      .map(col => row[col])
      .filter(v => v && String(v).trim() !== '' && String(v).trim() !== 'Description')
      .map(v => String(v).trim());

    // Filter out URLs from descriptions (some Description columns contain image URLs)
    const descText = descParts
      .filter(d => !d.startsWith('http'))
      .join(' ');

    // Parse date
    let date = sheetDate;
    if (row.Date) {
      if (typeof row.Date === 'number') {
        date = excelDateToISO(row.Date);
      }
    }

    // Parse time
    const timeStr = typeof row.Time === 'number' ? excelTimeToString(row.Time) : row.Time;
    const { start_time, end_time } = parseTimeRange(timeStr);

    xlsxIdCounter++;
    xlsxEvents.push({
      xlsx_id: `xlsx_${xlsxIdCounter}`,
      title: String(row.Title).trim(),
      date: date,
      time_raw: timeStr || null,
      start_time: start_time,
      end_time: end_time,
      venue: row.Location ? String(row.Location).trim() : null,
      room: row.ROom ? String(row.ROom).trim() : null,
      speakers_array: speakers,
      speakers_joined: speakers.join('; '),
      description: descText || null,
      sheet_name: sheetName,
    });
  }
}

console.log('XLSX events (after parsing):', xlsxEvents.length);
console.log('XLSX by date:');
const xlsxByDate = {};
xlsxEvents.forEach(e => { xlsxByDate[e.date] = (xlsxByDate[e.date] || 0) + 1; });
console.log(JSON.stringify(xlsxByDate, null, 2));

// ─── FUZZY MATCHING ─────────────────────────────────────────
// Normalize title for comparison
function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Similarity score (0-1)
function titleSimilarity(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;

  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) {
    const minLen = Math.min(na.length, nb.length);
    const maxLen = Math.max(na.length, nb.length);
    return minLen / maxLen;
  }

  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - (dist / maxLen);
}

// Match quality tiers
function matchQuality(xlsxEvent, prodEvent) {
  const titleSim = titleSimilarity(xlsxEvent.title, prodEvent.title);
  const sameDate = xlsxEvent.date === prodEvent.date;
  const sameRoom = xlsxEvent.room && prodEvent.room &&
    normalizeTitle(xlsxEvent.room) === normalizeTitle(prodEvent.room);

  // Start time comparison
  let sameStartTime = false;
  if (xlsxEvent.start_time && prodEvent.start_time) {
    // Compare just HH:MM portion
    const xlsxTime = xlsxEvent.start_time.substring(0, 5);
    const prodTime = prodEvent.start_time.substring(0, 5);
    sameStartTime = xlsxTime === prodTime;
  }

  // Tier 1: Exact title match + same date
  if (titleSim > 0.95 && sameDate) return { tier: 1, score: titleSim, method: 'exact_title_date' };

  // Tier 2: High title similarity + same date
  if (titleSim > 0.75 && sameDate) return { tier: 2, score: titleSim, method: 'high_title_date' };

  // Tier 3: Same date + same room + same time (different titles)
  if (sameDate && sameRoom && sameStartTime && titleSim > 0.3) {
    return { tier: 3, score: titleSim, method: 'date_room_time' };
  }

  // Tier 4: Moderate title similarity + same date
  if (titleSim > 0.55 && sameDate) return { tier: 4, score: titleSim, method: 'moderate_title_date' };

  // Tier 5: Title match regardless of date (in case dates shifted)
  if (titleSim > 0.85) return { tier: 5, score: titleSim, method: 'title_only' };

  return null;
}

// ─── PERFORM MATCHING ────────────────────────────────────────
const matches = []; // { xlsxEvent, prodEvent, quality }
const xlsxMatched = new Set(); // xlsx_id
const prodMatched = new Set(); // event_id

// Multiple pass matching (greedy, best matches first)
const allPairs = [];

for (const xe of xlsxEvents) {
  for (const pe of productionEvents) {
    const quality = matchQuality(xe, pe);
    if (quality) {
      allPairs.push({ xlsxEvent: xe, prodEvent: pe, quality });
    }
  }
}

// Sort by tier (ascending) then score (descending)
allPairs.sort((a, b) => {
  if (a.quality.tier !== b.quality.tier) return a.quality.tier - b.quality.tier;
  return b.quality.score - a.quality.score;
});

// Greedy matching
for (const pair of allPairs) {
  if (xlsxMatched.has(pair.xlsxEvent.xlsx_id)) continue;
  if (prodMatched.has(pair.prodEvent.event_id)) continue;

  matches.push(pair);
  xlsxMatched.add(pair.xlsxEvent.xlsx_id);
  prodMatched.add(pair.prodEvent.event_id);
}

const xlsxOnly = xlsxEvents.filter(e => !xlsxMatched.has(e.xlsx_id));
const prodOnly = productionEvents.filter(e => !prodMatched.has(e.event_id));

console.log('\n═══ MATCHING RESULTS ═══');
console.log(`Matched: ${matches.length}`);
console.log(`XLSX-only: ${xlsxOnly.length}`);
console.log(`Production-only: ${prodOnly.length}`);

// Match tier breakdown
const tierBreakdown = {};
matches.forEach(m => {
  const key = `Tier ${m.quality.tier} (${m.quality.method})`;
  tierBreakdown[key] = (tierBreakdown[key] || 0) + 1;
});
console.log('\nMatch tier breakdown:');
for (const [tier, count] of Object.entries(tierBreakdown)) {
  console.log(`  ${tier}: ${count}`);
}

// ─── FIELD COMPARISON FOR MATCHES ────────────────────────────
console.log('\n═══ FIELD COMPARISON ═══');

let xlsxHasMoreSpeakers = 0;
let xlsxHasDescription = 0;
let xlsxHasEndTime = 0;
let xlsxDiffRoom = 0;
let xlsxDiffTitle = 0;
const fieldDiffs = [];

for (const { xlsxEvent, prodEvent, quality } of matches) {
  const diffs = {};

  // Title differences
  if (normalizeTitle(xlsxEvent.title) !== normalizeTitle(prodEvent.title)) {
    diffs.title = { xlsx: xlsxEvent.title, prod: prodEvent.title, similarity: quality.score };
    xlsxDiffTitle++;
  }

  // Speaker comparison
  const prodSpeakers = prodEvent.speakers ? prodEvent.speakers.split(';').map(s => s.trim()).filter(Boolean) : [];
  if (xlsxEvent.speakers_array.length > prodSpeakers.length) {
    diffs.more_speakers = {
      xlsx_count: xlsxEvent.speakers_array.length,
      prod_count: prodSpeakers.length,
      xlsx_speakers: xlsxEvent.speakers_array,
      prod_speakers: prodSpeakers,
    };
    xlsxHasMoreSpeakers++;
  }

  // Description
  if (xlsxEvent.description && (!prodEvent.description || xlsxEvent.description.length > prodEvent.description.length + 50)) {
    diffs.longer_description = {
      xlsx_len: xlsxEvent.description.length,
      prod_len: (prodEvent.description || '').length,
    };
    xlsxHasDescription++;
  }

  // End time
  if (xlsxEvent.end_time && !prodEvent.end_time) {
    diffs.has_end_time = { xlsx: xlsxEvent.end_time, prod: null };
    xlsxHasEndTime++;
  }

  // Room differences
  if (xlsxEvent.room && prodEvent.room &&
      normalizeTitle(xlsxEvent.room) !== normalizeTitle(prodEvent.room)) {
    diffs.diff_room = { xlsx: xlsxEvent.room, prod: prodEvent.room };
    xlsxDiffRoom++;
  }

  if (Object.keys(diffs).length > 0) {
    fieldDiffs.push({
      xlsx_title: xlsxEvent.title,
      prod_title: prodEvent.title,
      prod_event_id: prodEvent.event_id,
      diffs,
    });
  }
}

console.log(`Events where XLSX has more speakers: ${xlsxHasMoreSpeakers}`);
console.log(`Events where XLSX has longer description: ${xlsxHasDescription}`);
console.log(`Events where XLSX has end_time but production doesn't: ${xlsxHasEndTime}`);
console.log(`Events with different rooms: ${xlsxDiffRoom}`);
console.log(`Events with different titles: ${xlsxDiffTitle}`);

// ─── XLSX-ONLY EVENTS (NEW) ────────────────────────────────
console.log('\n═══ XLSX-ONLY EVENTS ═══');
console.log(`Total: ${xlsxOnly.length}`);
xlsxOnly.forEach((e, i) => {
  console.log(`  ${i + 1}. [${e.date}] "${e.title}" (${e.room || 'no room'}) - ${e.time_raw || 'no time'}`);
});

// ─── PRODUCTION-ONLY EVENTS ─────────────────────────────────
console.log('\n═══ PRODUCTION-ONLY EVENTS ═══');
console.log(`Total: ${prodOnly.length}`);
prodOnly.slice(0, 20).forEach((e, i) => {
  console.log(`  ${i + 1}. [${e.date}] "${e.title}" (${e.room || 'no room'}) - ${e.start_time || 'no time'}`);
});
if (prodOnly.length > 20) console.log(`  ... and ${prodOnly.length - 20} more`);

// ─── FOUNDERS LIST ANALYSIS ─────────────────────────────────
const founders = xlsxParsed['Founders Name '] || [];
console.log('\n═══ FOUNDERS LIST ═══');
console.log(`Total founders: ${founders.length}`);
founders.slice(0, 5).forEach(f => {
  console.log(`  ${f.Name} - ${f['Post ']} ${f.__EMPTY ? '(LinkedIn: ' + f.__EMPTY + ')' : ''}`);
});

// ─── SAVE ANALYSIS RESULTS ──────────────────────────────────
const analysisOutput = {
  summary: {
    xlsx_total_events: xlsxEvents.length,
    production_total_events: productionEvents.length,
    matched: matches.length,
    xlsx_only: xlsxOnly.length,
    production_only: prodOnly.length,
    founders_list_count: founders.length,
    tier_breakdown: tierBreakdown,
  },
  field_comparison: {
    xlsx_has_more_speakers: xlsxHasMoreSpeakers,
    xlsx_has_longer_description: xlsxHasDescription,
    xlsx_has_end_time: xlsxHasEndTime,
    diff_rooms: xlsxDiffRoom,
    diff_titles: xlsxDiffTitle,
  },
  matches: matches.map(m => ({
    xlsx_title: m.xlsxEvent.title,
    prod_title: m.prodEvent.title,
    prod_event_id: m.prodEvent.event_id,
    quality: m.quality,
  })),
  xlsx_only_events: xlsxOnly,
  production_only_events: prodOnly.map(e => ({
    event_id: e.event_id,
    title: e.title,
    date: e.date,
    start_time: e.start_time,
    room: e.room,
  })),
  field_diffs: fieldDiffs,
  founders: founders,
};

fs.writeFileSync(
  path.join(__dirname, '..', 'analysis', 'comparison_data.json'),
  JSON.stringify(analysisOutput, null, 2)
);
console.log('\nSaved comparison_data.json');

// ─── CREATE MERGED FILE ──────────────────────────────────────
console.log('\n═══ CREATING MERGED FILE ═══');

const mergedEvents = [];

// 1. Matched events: merge data
for (const { xlsxEvent, prodEvent, quality } of matches) {
  const merged = { ...prodEvent };
  merged.source = 'both';
  merged.match_quality = quality;

  // Add xlsx-specific data that production might be missing
  if (xlsxEvent.end_time && !merged.end_time) {
    merged.end_time = xlsxEvent.end_time;
  }

  // Store xlsx speakers if they have more detail
  if (xlsxEvent.speakers_array.length > 0) {
    merged.xlsx_speakers = xlsxEvent.speakers_array;
  }

  // If xlsx has longer description, store it as supplemental
  if (xlsxEvent.description && (!merged.description || xlsxEvent.description.length > merged.description.length + 50)) {
    merged.xlsx_description = xlsxEvent.description;
  }

  // Store xlsx time_raw for reference
  if (xlsxEvent.time_raw) {
    merged.xlsx_time_raw = xlsxEvent.time_raw;
  }

  mergedEvents.push(merged);
}

// 2. Production-only events
for (const pe of prodOnly) {
  const merged = { ...pe };
  merged.source = 'production_only';
  mergedEvents.push(merged);
}

// 3. XLSX-only events (need enrichment later)
for (const xe of xlsxOnly) {
  const newEvent = {
    id: null,
    title: xe.title,
    description: xe.description,
    date: xe.date,
    start_time: xe.start_time,
    end_time: xe.end_time,
    venue: xe.venue,
    room: xe.room,
    speakers: xe.speakers_joined,
    knowledge_partners: null,
    session_type: null,
    event_id: xe.xlsx_id, // Use xlsx_id as placeholder
    add_to_calendar: true,
    notes: null,
    summary_one_liner: null,
    technical_depth: null,
    target_personas: null,
    networking_signals: null,
    keywords: null,
    goal_relevance: null,
    icebreaker: null,
    networking_tip: null,
    logo_urls: [],
    source: 'xlsx_only',
    xlsx_speakers: xe.speakers_array,
    xlsx_time_raw: xe.time_raw,
  };
  mergedEvents.push(newEvent);
}

// Sort by date, then start_time
mergedEvents.sort((a, b) => {
  const dateComp = (a.date || '').localeCompare(b.date || '');
  if (dateComp !== 0) return dateComp;
  return (a.start_time || '').localeCompare(b.start_time || '');
});

fs.writeFileSync(
  path.join(__dirname, '..', 'enriched', 'events_merged_v2.json'),
  JSON.stringify(mergedEvents, null, 2)
);

console.log(`Merged file created: ${mergedEvents.length} total events`);
console.log(`  - Both sources: ${mergedEvents.filter(e => e.source === 'both').length}`);
console.log(`  - Production only: ${mergedEvents.filter(e => e.source === 'production_only').length}`);
console.log(`  - XLSX only: ${mergedEvents.filter(e => e.source === 'xlsx_only').length}`);

// ─── EVENTS NEEDING ENRICHMENT ───────────────────────────────
const needsEnrichment = mergedEvents.filter(e => e.source === 'xlsx_only' && !e.summary_one_liner);
console.log(`\nEvents needing enrichment: ${needsEnrichment.length}`);
fs.writeFileSync(
  path.join(__dirname, '..', 'analysis', 'needs_enrichment.json'),
  JSON.stringify(needsEnrichment, null, 2)
);
console.log('Saved needs_enrichment.json');
