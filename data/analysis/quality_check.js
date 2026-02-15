const events = require('../enriched/events_official_merged.json');
console.log('=== FINAL MERGED FILE QUALITY CHECK ===');
console.log('Total events:', events.length);
console.log('');

let nullOneLiner = 0, nullDepth = 0, emptyKeywords = 0, emptyPersonas = 0;
let emptyGoalRel = 0, nullIcebreaker = 0, nullNetTip = 0;
for (const e of events) {
  if (e.summary_one_liner === null || e.summary_one_liner === undefined) nullOneLiner++;
  if (e.technical_depth === null || e.technical_depth === undefined) nullDepth++;
  if (e.keywords === undefined || e.keywords === null || e.keywords.length === 0) emptyKeywords++;
  if (e.target_personas === undefined || e.target_personas === null || e.target_personas.length === 0) emptyPersonas++;
  if (e.goal_relevance === undefined || e.goal_relevance === null || e.goal_relevance.length === 0) emptyGoalRel++;
  if (e.icebreaker === null || e.icebreaker === undefined) nullIcebreaker++;
  if (e.networking_tip === null || e.networking_tip === undefined) nullNetTip++;
}
console.log('Field completeness:');
console.log('  summary_one_liner null:', nullOneLiner);
console.log('  technical_depth null:', nullDepth);
console.log('  keywords empty:', emptyKeywords);
console.log('  target_personas empty:', emptyPersonas);
console.log('  goal_relevance empty:', emptyGoalRel);
console.log('  icebreaker null:', nullIcebreaker);
console.log('  networking_tip null:', nullNetTip);
console.log('');

const byDate = {};
for (const e of events) {
  if (byDate[e.date] === undefined) byDate[e.date] = 0;
  byDate[e.date]++;
}
console.log('By date:');
for (const d of Object.keys(byDate).sort()) {
  console.log('  ' + d + ': ' + byDate[d]);
}
console.log('');

const hh = events.filter(e => e.networking_signals && e.networking_signals.is_heavy_hitter);
console.log('Heavy hitters:', hh.length);

const withLogos = events.filter(e => e.logo_urls && e.logo_urls.length > 0);
console.log('Events with logos:', withLogos.length, '(' + (withLogos.length / events.length * 100).toFixed(1) + '%)');
console.log('');

// Sample new enriched events (id > 5300 are new)
const newEnriched = events.filter(e => e.id >= 5300);
console.log('=== SAMPLE NEW ENRICHED EVENTS (3 of ' + newEnriched.length + ') ===');
newEnriched.slice(0, 3).forEach((e, i) => {
  console.log((i + 1) + '. ' + e.title.substring(0, 70));
  console.log('   One-liner: ' + e.summary_one_liner);
  console.log('   Depth: ' + e.technical_depth + ' | Personas: ' + (e.target_personas || []).join(', '));
  console.log('   Keywords: ' + (e.keywords || []).map(k => k.keyword).join(', '));
  console.log('   Icebreaker: ' + (e.icebreaker || '').substring(0, 80));
  console.log('   Logos: ' + (e.logo_urls || []).length);
  console.log('');
});

// Check schema consistency — all events should have same keys
const firstKeys = Object.keys(events[0]).sort().join(',');
let schemaIssues = 0;
for (const e of events) {
  const keys = Object.keys(e).sort().join(',');
  if (keys !== firstKeys) schemaIssues++;
}
console.log('Schema consistency: ' + (schemaIssues === 0 ? 'ALL MATCH' : schemaIssues + ' events have different keys'));
if (schemaIssues > 0) {
  console.log('First event keys: ' + firstKeys);
  const mismatch = events.find(e => Object.keys(e).sort().join(',') !== firstKeys);
  console.log('Mismatch event keys: ' + Object.keys(mismatch).sort().join(','));
}
