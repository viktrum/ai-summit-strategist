const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── LOAD DATA ───────────────────────────────────────────
const official = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'raw', 'official_site_scraped.json'), 'utf8')
);
const production = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'production', 'events.json'), 'utf8')
);

console.log(`Official site events: ${official.length}`);
console.log(`Production events: ${production.length}`);

// ─── MATCHING HELPERS ────────────────────────────────────
function norm(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function titleSimilarity(a, b) {
  const wordsA = new Set(norm(a).split(' ').filter(w => w.length > 2));
  const wordsB = new Set(norm(b).split(' ').filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.max(wordsA.size, wordsB.size);
}

function normTime(t) {
  if (t === null || t === undefined) return null;
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? m[1].padStart(2, '0') + ':' + m[2] : null;
}

function speakersToString(speakersArray) {
  if (!speakersArray || speakersArray.length === 0) return '';
  return speakersArray.join('; ');
}

function kpToString(kpArray) {
  if (!kpArray || kpArray.length === 0) return '';
  return kpArray.join('; ');
}

function generateEventId() {
  return crypto.randomBytes(12).toString('hex');
}

// ─── MATCH OFFICIAL → PRODUCTION ─────────────────────────
const prodByDate = {};
for (const p of production) {
  if (!prodByDate[p.date]) prodByDate[p.date] = [];
  prodByDate[p.date].push(p);
}

const matched = [];
const newEvents = [];
const usedProdIds = new Set();

for (const o of official) {
  const oTitle = norm(o.title);
  const candidates = prodByDate[o.date] || [];

  // Exact title match
  let match = candidates.find(p => !usedProdIds.has(p.event_id) && norm(p.title) === oTitle);

  // Substring match (first 40 chars)
  if (!match) {
    const sub = oTitle.substring(0, Math.min(40, oTitle.length));
    if (sub.length > 10) {
      match = candidates.find(p =>
        !usedProdIds.has(p.event_id) &&
        (norm(p.title).includes(sub) || oTitle.includes(norm(p.title).substring(0, 40)))
      );
    }
  }

  // Jaccard similarity > 0.6
  if (!match) {
    let bestSim = 0;
    let bestMatch = null;
    for (const p of candidates) {
      if (usedProdIds.has(p.event_id)) continue;
      const sim = titleSimilarity(o.title, p.title);
      if (sim > bestSim && sim > 0.6) {
        bestSim = sim;
        bestMatch = p;
      }
    }
    if (bestMatch) match = bestMatch;
  }

  // Same date + time + room (catches renamed events)
  if (!match) {
    const oTime = normTime(o.start_time);
    const oRoom = norm(o.room);
    if (oTime && oRoom) {
      match = candidates.find(p => {
        if (usedProdIds.has(p.event_id)) return false;
        return normTime(p.start_time) === oTime && norm(p.room) === oRoom;
      });
    }
  }

  if (match) {
    usedProdIds.add(match.event_id);
    matched.push({ official: o, production: match });
  } else {
    newEvents.push(o);
  }
}

const prodOnly = production.filter(p => !usedProdIds.has(p.event_id));

console.log(`\n=== MATCH RESULTS ===`);
console.log(`Matched: ${matched.length}`);
console.log(`New from official site: ${newEvents.length}`);
console.log(`Production-only (not on official site): ${prodOnly.length}`);

// ─── BUILD MERGED EVENTS (EXACT PRODUCTION STRUCTURE) ────
let nextId = Math.max(...production.map(p => p.id || 0)) + 1;

const mergedEvents = [];

// Track source internally (not in output)
const sourceMap = {};

// 1. Matched: Official base data + production enrichment
for (const { official: o, production: p } of matched) {
  const event = {
    id: p.id,
    title: o.title,
    description: o.description || p.description,
    date: o.date,
    start_time: o.start_time,
    end_time: o.end_time || p.end_time,
    venue: o.venue || p.venue,
    room: o.room || p.room,
    speakers: speakersToString(o.speakers) || p.speakers,
    knowledge_partners: kpToString(o.knowledge_partners) || p.knowledge_partners,
    session_type: p.session_type || 'Main Summit Session',
    event_id: p.event_id,
    add_to_calendar: true,
    notes: p.notes,
    summary_one_liner: p.summary_one_liner,
    technical_depth: p.technical_depth,
    target_personas: p.target_personas,
    networking_signals: p.networking_signals,
    keywords: p.keywords,
    goal_relevance: p.goal_relevance,
    icebreaker: p.icebreaker,
    networking_tip: p.networking_tip,
    logo_urls: p.logo_urls || [],
  };
  mergedEvents.push(event);
  sourceMap[event.event_id] = 'matched';
}

// 2. New events (need enrichment via Haiku)
for (const o of newEvents) {
  const eid = generateEventId();
  const event = {
    id: nextId++,
    title: o.title,
    description: o.description,
    date: o.date,
    start_time: o.start_time,
    end_time: o.end_time,
    venue: o.venue,
    room: o.room,
    speakers: speakersToString(o.speakers),
    knowledge_partners: kpToString(o.knowledge_partners),
    session_type: 'Main Summit Session',
    event_id: eid,
    add_to_calendar: true,
    notes: null,
    summary_one_liner: null,
    technical_depth: null,
    target_personas: [],
    networking_signals: {
      is_heavy_hitter: false,
      decision_maker_density: 'Medium',
      investor_presence: 'Unlikely',
    },
    keywords: [],
    goal_relevance: [],
    icebreaker: null,
    networking_tip: null,
    logo_urls: [],
  };
  mergedEvents.push(event);
  sourceMap[eid] = 'new_official';
}

// 3. Production-only events (keep as-is)
for (const p of prodOnly) {
  mergedEvents.push({ ...p });
  sourceMap[p.event_id] = 'production_only';
}

// Sort by date, then start_time
mergedEvents.sort((a, b) => {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return (a.start_time || '').localeCompare(b.start_time || '');
});

// ─── SAVE OUTPUTS ────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'enriched');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Full merged file (exact production structure)
const mergedPath = path.join(outDir, 'events_official_merged.json');
fs.writeFileSync(mergedPath, JSON.stringify(mergedEvents, null, 2));
console.log(`\nSaved merged file: ${mergedPath}`);
console.log(`Total events: ${mergedEvents.length}`);

// Events needing enrichment (internal use only — includes source info for the enrichment script)
const needEnrichment = mergedEvents.filter(e => sourceMap[e.event_id] === 'new_official');
const needEnrichmentPath = path.join(__dirname, 'events_needing_enrichment.json');
fs.writeFileSync(needEnrichmentPath, JSON.stringify(needEnrichment, null, 2));
console.log(`Events needing enrichment: ${needEnrichment.length}`);
console.log(`Saved to: ${needEnrichmentPath}`);

// Source map (for internal tracking, not in final output)
const sourceMapPath = path.join(__dirname, 'merge_source_map.json');
const sourceSummary = { matched: 0, new_official: 0, production_only: 0 };
for (const v of Object.values(sourceMap)) sourceSummary[v]++;
fs.writeFileSync(sourceMapPath, JSON.stringify({ summary: sourceSummary, details: sourceMap }, null, 2));

// Summary by date
console.log(`\n=== BY DATE ===`);
const byDate = {};
for (const e of mergedEvents) {
  const src = sourceMap[e.event_id];
  if (!byDate[e.date]) byDate[e.date] = { matched: 0, new_official: 0, production_only: 0, total: 0 };
  byDate[e.date][src]++;
  byDate[e.date].total++;
}
for (const d of Object.keys(byDate).sort()) {
  const s = byDate[d];
  console.log(`  ${d}: ${s.matched} matched, ${s.new_official} new, ${s.production_only} prod-only = ${s.total} total`);
}

// Sample new events
console.log(`\n=== SAMPLE NEW EVENTS (first 5) ===`);
needEnrichment.slice(0, 5).forEach((e, i) => {
  console.log(`  ${i + 1}. [${e.date}] ${e.title.substring(0, 70)}`);
  console.log(`     ${e.start_time || 'N/A'} | ${e.room || 'N/A'}`);
});
