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

console.log(`Official site (base truth): ${official.length}`);
console.log(`Production (enrichment source): ${production.length}`);

// ─── HELPERS ─────────────────────────────────────────────
function norm(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function normTime(t) {
  if (t === null || t === undefined) return null;
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? m[1].padStart(2, '0') + ':' + m[2] : null;
}

function titleWords(s) {
  return new Set(norm(s).split(' ').filter(w => w.length > 2));
}

function jaccardSimilarity(a, b) {
  const wordsA = titleWords(a);
  const wordsB = titleWords(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) if (wordsB.has(w)) intersection++;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

function speakersToString(arr) {
  if (!arr || arr.length === 0) return '';
  return arr.join('; ');
}

function kpToString(arr) {
  if (!arr || arr.length === 0) return '';
  return arr.join('; ');
}

function generateEventId() {
  return crypto.randomBytes(12).toString('hex');
}

// ─── MULTI-SIGNAL MATCHING ──────────────────────────────
// Index production by date
const prodByDate = {};
for (const p of production) {
  if (!prodByDate[p.date]) prodByDate[p.date] = [];
  prodByDate[p.date].push(p);
}

const matched = [];         // { official, production, matchType, confidence }
const unmatchedOfficial = []; // official events with no production match
const usedProdIds = new Set();

for (const o of official) {
  const oTitle = norm(o.title);
  const oTime = normTime(o.start_time);
  const oRoom = norm(o.room);
  const candidates = prodByDate[o.date] || [];
  const available = candidates.filter(p => !usedProdIds.has(p.event_id));

  let bestMatch = null;
  let bestScore = 0;
  let bestType = '';

  for (const p of available) {
    const pTitle = norm(p.title);
    const pTime = normTime(p.start_time);
    const pRoom = norm(p.room);
    let score = 0;
    let matchType = [];

    // ── Signal 1: Title similarity (CORE indicator) ──
    const jaccard = jaccardSimilarity(o.title, p.title);
    if (oTitle === pTitle) {
      score += 10; // Exact title = very high confidence
      matchType.push('exact_title');
    } else if (jaccard >= 0.6) {
      score += 7;
      matchType.push('title_sim_' + jaccard.toFixed(2));
    } else if (jaccard >= 0.4) {
      score += 4;
      matchType.push('title_partial_' + jaccard.toFixed(2));
    } else if (jaccard >= 0.25) {
      score += 2;
      matchType.push('title_weak_' + jaccard.toFixed(2));
    }

    // Substring match (first 40 chars)
    const oSub = oTitle.substring(0, Math.min(40, oTitle.length));
    const pSub = pTitle.substring(0, Math.min(40, pTitle.length));
    if (oSub.length > 10 && (pTitle.includes(oSub) || oTitle.includes(pSub))) {
      score += 3;
      matchType.push('substr');
    }

    // ── Signal 2: Same time ──
    if (oTime && pTime && oTime === pTime) {
      score += 2;
      matchType.push('same_time');
    }

    // ── Signal 3: Same room ──
    if (oRoom && pRoom && oRoom === pRoom) {
      score += 3;
      matchType.push('same_room');
    }

    // ── Signal 4: Speaker overlap ──
    const oSpeakers = speakersToString(o.speakers).toLowerCase();
    const pSpeakers = (p.speakers || '').toLowerCase();
    if (oSpeakers && pSpeakers) {
      // Extract last names (rough)
      const oNames = oSpeakers.split(/[;,]/).map(n => n.trim().split(/\s+/).pop()).filter(n => n && n.length > 3);
      const pNames = pSpeakers.split(/[;,]/).map(n => n.trim().split(/\s+/).pop()).filter(n => n && n.length > 3);
      const speakerOverlap = oNames.filter(n => pNames.includes(n)).length;
      if (speakerOverlap >= 2) {
        score += 4;
        matchType.push('speakers_' + speakerOverlap);
      } else if (speakerOverlap === 1) {
        score += 2;
        matchType.push('speaker_1');
      }
    }

    // ── Threshold check ──
    // Minimum: Need SOME title signal (>= 2) OR strong contextual (time+room)
    const hasTitle = jaccard >= 0.25 || (oSub.length > 10 && (pTitle.includes(oSub) || oTitle.includes(pSub)));
    const hasContext = (oTime && pTime && oTime === pTime) && (oRoom && pRoom && oRoom === pRoom);

    if (score > bestScore && (hasTitle || hasContext)) {
      bestScore = score;
      bestMatch = p;
      bestType = matchType.join('+');
    }
  }

  // Only accept matches with sufficient confidence
  if (bestMatch && bestScore >= 5) {
    usedProdIds.add(bestMatch.event_id);
    matched.push({
      official: o,
      production: bestMatch,
      matchType: bestType,
      confidence: bestScore,
    });
  } else if (bestMatch && bestScore >= 3) {
    // Low confidence — still match but flag it
    usedProdIds.add(bestMatch.event_id);
    matched.push({
      official: o,
      production: bestMatch,
      matchType: bestType + '_LOW_CONF',
      confidence: bestScore,
    });
  } else {
    unmatchedOfficial.push(o);
  }
}

const prodOnly = production.filter(p => !usedProdIds.has(p.event_id));

console.log(`\n=== MATCH RESULTS (Smart v2) ===`);
console.log(`Matched: ${matched.length} (high confidence: ${matched.filter(m => m.confidence >= 5).length}, low: ${matched.filter(m => m.confidence < 5).length})`);
console.log(`Unmatched official (new events): ${unmatchedOfficial.length}`);
console.log(`Production-only (stale/removed): ${prodOnly.length}`);

// ─── BUILD MERGED FILE ──────────────────────────────────
let nextId = Math.max(...production.map(p => p.id || 0)) + 1;
const mergedEvents = [];

// 1. Matched: Official data as base, pull id/event_id + enrichment from production
for (const { official: o, production: p } of matched) {
  mergedEvents.push({
    // CRITICAL: Keep production id and event_id for backward compat
    id: p.id,
    event_id: p.event_id,
    // Official site data (base truth for content)
    title: o.title,
    description: o.description || p.description,
    date: o.date,
    start_time: o.start_time,
    end_time: o.end_time || p.end_time,
    venue: o.venue || p.venue,
    room: o.room || p.room,
    speakers: speakersToString(o.speakers) || p.speakers,
    knowledge_partners: kpToString(o.knowledge_partners) || p.knowledge_partners,
    // Production metadata
    session_type: p.session_type || 'Main Summit Session',
    add_to_calendar: true,
    notes: p.notes,
    // Production enrichment (keep — these were carefully curated)
    summary_one_liner: p.summary_one_liner,
    technical_depth: p.technical_depth,
    target_personas: p.target_personas,
    networking_signals: p.networking_signals,
    keywords: p.keywords,
    goal_relevance: p.goal_relevance,
    icebreaker: p.icebreaker,
    networking_tip: p.networking_tip,
    logo_urls: p.logo_urls || [],
  });
}

// 2. New events (no production match — need enrichment)
for (const o of unmatchedOfficial) {
  mergedEvents.push({
    id: nextId++,
    event_id: generateEventId(),
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
    add_to_calendar: true,
    notes: null,
    summary_one_liner: null,
    technical_depth: null,
    target_personas: [],
    networking_signals: { is_heavy_hitter: false, decision_maker_density: 'Medium', investor_presence: 'Unlikely' },
    keywords: [],
    goal_relevance: [],
    icebreaker: null,
    networking_tip: null,
    logo_urls: [],
  });
}

// 3. Production-only (keep for backward compat with existing plans)
for (const p of prodOnly) {
  mergedEvents.push({ ...p });
}

// Sort
mergedEvents.sort((a, b) => {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return (a.start_time || '').localeCompare(b.start_time || '');
});

// ─── SAVE ────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'enriched');
const outPath = path.join(outDir, 'events_official_merged_v2.json');
fs.writeFileSync(outPath, JSON.stringify(mergedEvents, null, 2));
console.log(`\nSaved: ${outPath}`);
console.log(`Total events: ${mergedEvents.length}`);

// Events needing enrichment
const needEnrich = mergedEvents.filter(e => e.summary_one_liner === null);
const needEnrichPath = path.join(__dirname, 'events_needing_enrichment_v2.json');
fs.writeFileSync(needEnrichPath, JSON.stringify(needEnrich, null, 2));
console.log(`Need enrichment: ${needEnrich.length}`);

// ─── COMPARISON WITH v1 ─────────────────────────────────
const v1 = JSON.parse(fs.readFileSync(path.join(outDir, 'events_official_merged.json'), 'utf8'));
console.log(`\n=== v1 vs v2 COMPARISON ===`);
console.log(`v1 total: ${v1.length}, v2 total: ${mergedEvents.length}`);

// Count by source in v1 (based on enrichment state)
const v1Enriched = v1.filter(e => e.summary_one_liner !== null).length;
const v1NeedEnrich = v1.length - v1Enriched;

console.log(`v1 matched+prod-only (enriched): ${v1Enriched}, v1 new (was null): ${v1NeedEnrich}`);
console.log(`v2 matched: ${matched.length}, v2 new: ${unmatchedOfficial.length}, v2 prod-only: ${prodOnly.length}`);

// How many more matches did v2 find?
const v1MatchedIds = new Set(v1.filter(e => e.summary_one_liner !== null && e.id < 5300).map(e => e.event_id));
const v2MatchedIds = new Set(matched.map(m => m.production.event_id));

const v2Only = [...v2MatchedIds].filter(id => !v1MatchedIds.has(id));
const v1Only = [...v1MatchedIds].filter(id => !v2MatchedIds.has(id));

console.log(`\nv2 found ${v2Only.length} matches that v1 missed`);
console.log(`v1 found ${v1Only.length} matches that v2 missed`);

// Show match types distribution
const typeCounts = {};
for (const m of matched) {
  const type = m.confidence >= 5 ? 'high_conf' : 'low_conf';
  typeCounts[type] = (typeCounts[type] || 0) + 1;
}
console.log('\nMatch confidence distribution:', typeCounts);

// Show low-confidence matches for review
const lowConf = matched.filter(m => m.confidence < 5);
if (lowConf.length > 0) {
  console.log(`\n=== LOW CONFIDENCE MATCHES (${lowConf.length}) ===`);
  lowConf.slice(0, 10).forEach((m, i) => {
    console.log(`${i + 1}. OFFI: ${m.official.title.substring(0, 65)}`);
    console.log(`   PROD: ${m.production.title.substring(0, 65)}`);
    console.log(`   Score: ${m.confidence} | Type: ${m.matchType}`);
    console.log('');
  });
}

// By date breakdown
console.log('=== BY DATE ===');
const byDate = {};
for (const m of matched) {
  if (!byDate[m.official.date]) byDate[m.official.date] = { matched: 0 };
  byDate[m.official.date].matched++;
}
for (const o of unmatchedOfficial) {
  if (!byDate[o.date]) byDate[o.date] = {};
  byDate[o.date].new = (byDate[o.date].new || 0) + 1;
}
for (const p of prodOnly) {
  if (!byDate[p.date]) byDate[p.date] = {};
  byDate[p.date].prod_only = (byDate[p.date].prod_only || 0) + 1;
}
for (const d of Object.keys(byDate).sort()) {
  const s = byDate[d];
  console.log(`  ${d}: ${s.matched || 0} matched, ${s.new || 0} new, ${s.prod_only || 0} prod-only`);
}
