/**
 * AI Semantic Matching: Production-only events vs Official-only events
 *
 * Uses Claude Haiku to evaluate whether production-only events (151+)
 * and official-only events (233) are the same conference session with
 * different titles.
 *
 * Strategy:
 * 1. For each production-only event, find official candidates with same date
 * 2. Prioritize: same room > same time > speaker overlap
 * 3. Send batches of 10 pairs to Claude Haiku for scoring
 * 4. Save results to ai_match_results.json
 */

const Anthropic = require('@anthropic-ai/sdk').default;
const fs = require('fs');
const path = require('path');

// Load API key from root .env
const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
if (!apiKeyMatch) {
  console.error('ERROR: ANTHROPIC_API_KEY not found in .env');
  process.exit(1);
}
const ANTHROPIC_API_KEY = apiKeyMatch[1].trim();

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Load data
const mergeMap = require('./merge_source_map.json');
const prodEvents = require('../production/events.json');
const officialEvents = require('../raw/official_site_scraped.json');

// Get production-only event IDs
const prodOnlyIds = new Set(
  Object.entries(mergeMap.details)
    .filter(([_, status]) => status === 'production_only')
    .map(([id]) => id)
);

// Get new-official event IDs (these are the ones we need to match against)
const newOfficialIds = new Set(
  Object.entries(mergeMap.details)
    .filter(([_, status]) => status === 'new_official')
    .map(([id]) => id)
);

// Filter to production-only events
const prodOnlyEvents = prodEvents.filter(e => prodOnlyIds.has(e.event_id));
console.log(`Production-only events: ${prodOnlyEvents.length}`);

// Build an index of official events by date for fast lookup
const officialByDate = {};
for (const oe of officialEvents) {
  if (!officialByDate[oe.date]) officialByDate[oe.date] = [];
  officialByDate[oe.date].push(oe);
}

// Normalize room names for comparison
function normalizeRoom(room) {
  if (!room) return '';
  return room.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Normalize time for comparison (handle .000 suffix)
function normalizeTime(time) {
  if (!time) return '';
  return time.replace(/\.000$/, '').trim();
}

// Extract speaker last names for overlap detection
function extractSpeakerNames(speakers) {
  if (!speakers) return [];
  let speakerList;
  if (Array.isArray(speakers)) {
    speakerList = speakers;
  } else {
    // Production format: semicolon or comma separated
    speakerList = speakers.split(/[;]/).map(s => s.trim()).filter(Boolean);
  }
  // Extract significant name parts (last names, first names)
  return speakerList.map(s => {
    // Remove titles, affiliations (after comma)
    const name = s.split(',')[0].replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.|Shri|Smt\.|Hon'ble|Her Excellency|His Excellency)\s*/gi, '').trim();
    return name.toLowerCase();
  }).filter(Boolean);
}

// Check if two speaker lists have overlap
function speakerOverlap(speakers1, speakers2) {
  const names1 = extractSpeakerNames(speakers1);
  const names2 = extractSpeakerNames(speakers2);

  let matches = 0;
  for (const n1 of names1) {
    for (const n2 of names2) {
      // Check if last name matches (last word of name)
      const last1 = n1.split(/\s+/).pop();
      const last2 = n2.split(/\s+/).pop();
      if (last1.length > 2 && last2.length > 2 && last1 === last2) {
        matches++;
        break;
      }
    }
  }
  return matches;
}

// Find best candidate matches for a production event from official events
function findCandidates(prodEvent) {
  const sameDateEvents = officialByDate[prodEvent.date] || [];
  if (sameDateEvents.length === 0) return [];

  const prodRoom = normalizeRoom(prodEvent.room);
  const prodTime = normalizeTime(prodEvent.start_time);

  // Score each official event as a candidate
  const scored = sameDateEvents.map(oe => {
    const offRoom = normalizeRoom(oe.room);
    const offTime = normalizeTime(oe.start_time);

    let priority = 0;
    const sameRoom = prodRoom && offRoom && prodRoom === offRoom;
    const sameTime = prodTime && offTime && prodTime === offTime;
    const spkOverlap = speakerOverlap(prodEvent.speakers, oe.speakers);

    if (sameRoom && sameTime) priority = 100 + spkOverlap * 10;
    else if (sameRoom) priority = 50 + spkOverlap * 10;
    else if (sameTime) priority = 20 + spkOverlap * 10;
    else if (spkOverlap > 0) priority = spkOverlap * 10;
    else priority = 0;

    return {
      official: oe,
      sameRoom,
      sameTime,
      speakerOverlap: spkOverlap,
      priority
    };
  });

  // Sort by priority descending, take top 3
  scored.sort((a, b) => b.priority - a.priority);
  return scored.filter(s => s.priority > 0).slice(0, 3);
}

// Format speakers for display
function formatSpeakers(speakers) {
  if (!speakers) return 'None listed';
  if (Array.isArray(speakers)) return speakers.join('; ');
  return speakers;
}

// Build all pairs to evaluate
function buildPairs() {
  const pairs = [];

  for (const pe of prodOnlyEvents) {
    const candidates = findCandidates(pe);

    if (candidates.length === 0) {
      // No candidates with any overlap - record as no-match
      pairs.push({
        prod_event_id: pe.event_id,
        prod_title: pe.title,
        prod_date: pe.date,
        prod_room: pe.room,
        prod_time: normalizeTime(pe.start_time),
        prod_speakers: formatSpeakers(pe.speakers),
        official_id: null,
        official_title: null,
        official_room: null,
        official_time: null,
        official_speakers: null,
        same_room: false,
        same_time: false,
        speaker_overlap: 0,
        skip: true,
        score: 0,
        reasoning: 'No candidates found on same date with room/time/speaker overlap'
      });
      continue;
    }

    for (const cand of candidates) {
      pairs.push({
        prod_event_id: pe.event_id,
        prod_title: pe.title,
        prod_date: pe.date,
        prod_room: pe.room,
        prod_time: normalizeTime(pe.start_time),
        prod_speakers: formatSpeakers(pe.speakers),
        official_id: cand.official.official_id,
        official_title: cand.official.title,
        official_room: cand.official.room,
        official_time: normalizeTime(cand.official.start_time),
        official_speakers: formatSpeakers(cand.official.speakers),
        same_room: cand.sameRoom,
        same_time: cand.sameTime,
        speaker_overlap: cand.speakerOverlap,
        skip: false,
        priority: cand.priority
      });
    }
  }

  return pairs;
}

// Send a batch of pairs to Claude Haiku for evaluation
async function evaluateBatch(batch, batchNum, totalBatches) {
  const pairDescriptions = batch.map((pair, i) => {
    return `PAIR ${i + 1}:
Production Event: "${pair.prod_title}"
  - Date: ${pair.prod_date}, Room: ${pair.prod_room}, Time: ${pair.prod_time}
  - Speakers: ${pair.prod_speakers}
Official Event: "${pair.official_title}"
  - Date: ${pair.prod_date}, Room: ${pair.official_room}, Time: ${pair.official_time}
  - Speakers: ${pair.official_speakers}
Context: Same room: ${pair.same_room}, Same time: ${pair.same_time}, Speaker name overlap: ${pair.speaker_overlap}`;
  }).join('\n\n');

  const prompt = `You are comparing pairs of conference events from the India AI Impact Summit. These events come from two different data sources (a production database and the official website). They may be the same event with a renamed/rewritten title, or genuinely different events that happen to share a room.

For each pair, score 1-5:
1 = Definitely different events (completely different topics, different speakers, no connection)
2 = Probably different (some vague thematic overlap but clearly distinct sessions)
3 = Uncertain (could go either way - some topic/speaker overlap but titles suggest different focus)
4 = Probably same event (strong topic overlap, speaker overlap, title is plausibly a rewrite)
5 = Definitely same event (same core topic, significant speaker overlap, title is clearly a rewrite)

Consider: topic overlap, speaker name overlap, whether one title could be a rewrite/expansion of the other, and the room/time context.

${pairDescriptions}

Respond with ONLY a JSON array of objects, one per pair, in order:
[{"pair": 1, "score": <1-5>, "reasoning": "<brief explanation, 15 words max>"},...]`;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text.trim();
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error(`  Batch ${batchNum}: Could not parse JSON from response (attempt ${attempt + 1})`);
        if (attempt < maxRetries - 1) continue;
        return batch.map((_, i) => ({ pair: i + 1, score: 0, reasoning: 'Failed to parse AI response' }));
      }

      const results = JSON.parse(jsonMatch[0]);
      console.log(`  Batch ${batchNum}/${totalBatches} complete (${results.length} pairs scored)`);
      return results;
    } catch (err) {
      console.error(`  Batch ${batchNum}: Error (attempt ${attempt + 1}):`, err.message);
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      } else {
        return batch.map((_, i) => ({ pair: i + 1, score: 0, reasoning: `API error: ${err.message}` }));
      }
    }
  }
}

async function main() {
  console.log('Building candidate pairs...');
  const allPairs = buildPairs();

  const skippedPairs = allPairs.filter(p => p.skip);
  const activePairs = allPairs.filter(p => !p.skip);

  console.log(`Total pairs: ${allPairs.length}`);
  console.log(`  Skipped (no candidates): ${skippedPairs.length}`);
  console.log(`  Active (to evaluate): ${activePairs.length}`);

  // Show distribution of active pairs
  const sameRoomAndTime = activePairs.filter(p => p.same_room && p.same_time).length;
  const sameRoomOnly = activePairs.filter(p => p.same_room && !p.same_time).length;
  const sameTimeOnly = activePairs.filter(p => !p.same_room && p.same_time).length;
  const speakerOnly = activePairs.filter(p => !p.same_room && !p.same_time).length;
  console.log(`  Same room + time: ${sameRoomAndTime}`);
  console.log(`  Same room only: ${sameRoomOnly}`);
  console.log(`  Same time only: ${sameTimeOnly}`);
  console.log(`  Speaker overlap only: ${speakerOnly}`);

  // Batch active pairs into groups of 10
  const BATCH_SIZE = 10;
  const batches = [];
  for (let i = 0; i < activePairs.length; i += BATCH_SIZE) {
    batches.push(activePairs.slice(i, i + BATCH_SIZE));
  }
  console.log(`\nProcessing ${batches.length} batches of up to ${BATCH_SIZE} pairs...`);

  // Process batches sequentially (to respect rate limits)
  const results = [];
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchResults = await evaluateBatch(batch, i + 1, batches.length);

    // Merge AI scores back into pair data
    for (let j = 0; j < batch.length; j++) {
      const pair = { ...batch[j] };
      const aiResult = batchResults[j] || { score: 0, reasoning: 'Missing from AI response' };
      pair.ai_score = aiResult.score;
      pair.ai_reasoning = aiResult.reasoning;
      delete pair.skip;
      delete pair.priority;
      results.push(pair);
    }

    // Small delay between batches to avoid rate limiting
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Add skipped pairs to results
  for (const pair of skippedPairs) {
    const p = { ...pair };
    p.ai_score = 0;
    p.ai_reasoning = p.reasoning;
    delete p.skip;
    delete p.reasoning;
    results.push(p);
  }

  // Analyze results: find best match per production event
  const bestMatches = {};
  for (const r of results) {
    const pid = r.prod_event_id;
    if (!bestMatches[pid] || (r.ai_score || 0) > (bestMatches[pid].ai_score || 0)) {
      bestMatches[pid] = r;
    }
  }

  const bestMatchList = Object.values(bestMatches);
  const confidentMatches = bestMatchList.filter(r => r.ai_score >= 4);
  const maybes = bestMatchList.filter(r => r.ai_score === 3);
  const nonMatches = bestMatchList.filter(r => r.ai_score >= 1 && r.ai_score <= 2);
  const noCandidates = bestMatchList.filter(r => r.ai_score === 0);

  console.log('\n========== RESULTS SUMMARY ==========');
  console.log(`Total production-only events: ${prodOnlyEvents.length}`);
  console.log(`Confident matches (score 4-5): ${confidentMatches.length}`);
  console.log(`  Score 5 (definitely same): ${confidentMatches.filter(r => r.ai_score === 5).length}`);
  console.log(`  Score 4 (probably same): ${confidentMatches.filter(r => r.ai_score === 4).length}`);
  console.log(`Uncertain (score 3): ${maybes.length}`);
  console.log(`Non-matches (score 1-2): ${nonMatches.length}`);
  console.log(`  Score 2: ${nonMatches.filter(r => r.ai_score === 2).length}`);
  console.log(`  Score 1: ${nonMatches.filter(r => r.ai_score === 1).length}`);
  console.log(`No candidates found: ${noCandidates.length}`);

  // Show some example matches
  console.log('\n--- Example Confident Matches (score 5) ---');
  confidentMatches.filter(r => r.ai_score === 5).slice(0, 5).forEach(r => {
    console.log(`  PROD: "${r.prod_title}"`);
    console.log(`  OFCL: "${r.official_title}"`);
    console.log(`  Why: ${r.ai_reasoning}`);
    console.log('');
  });

  console.log('--- Example Non-Matches (score 1) ---');
  nonMatches.filter(r => r.ai_score === 1).slice(0, 5).forEach(r => {
    console.log(`  PROD: "${r.prod_title}"`);
    console.log(`  OFCL: "${r.official_title}"`);
    console.log(`  Why: ${r.ai_reasoning}`);
    console.log('');
  });

  // Save full results
  const output = {
    metadata: {
      generated_at: new Date().toISOString(),
      production_only_count: prodOnlyEvents.length,
      total_pairs_evaluated: activePairs.length,
      no_candidates: noCandidates.length,
      model: 'claude-haiku-4-5-20251001'
    },
    summary: {
      confident_matches: confidentMatches.length,
      score_5_definite: confidentMatches.filter(r => r.ai_score === 5).length,
      score_4_probable: confidentMatches.filter(r => r.ai_score === 4).length,
      uncertain_score_3: maybes.length,
      non_matches: nonMatches.length,
      score_2: nonMatches.filter(r => r.ai_score === 2).length,
      score_1: nonMatches.filter(r => r.ai_score === 1).length,
      no_candidates: noCandidates.length
    },
    best_matches: bestMatchList.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0)),
    all_pairs: results
  };

  const outputPath = path.resolve(__dirname, 'ai_match_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
