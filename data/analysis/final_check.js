const fs = require('fs');
const m = require('../enriched/events_official_merged.json');

console.log('=== FINAL MERGED FILE STATS ===');
console.log('Total events: ' + m.length);
console.log('');

const nullOneLiner = m.filter(e => e.summary_one_liner === null || e.summary_one_liner === undefined).length;
const nullDepth = m.filter(e => e.technical_depth === null || e.technical_depth === undefined).length;
const emptyPersonas = m.filter(e => e.target_personas === undefined || e.target_personas.length === 0).length;
const emptyKeywords = m.filter(e => e.keywords === undefined || e.keywords.length === 0).length;
const nullIcebreaker = m.filter(e => e.icebreaker === null || e.icebreaker === undefined).length;
const withLogos = m.filter(e => e.logo_urls && e.logo_urls.length > 0).length;

console.log('Field completeness:');
console.log('  summary_one_liner: ' + (m.length - nullOneLiner) + '/' + m.length);
console.log('  technical_depth: ' + (m.length - nullDepth) + '/' + m.length);
console.log('  target_personas: ' + (m.length - emptyPersonas) + '/' + m.length);
console.log('  keywords: ' + (m.length - emptyKeywords) + '/' + m.length);
console.log('  icebreaker: ' + (m.length - nullIcebreaker) + '/' + m.length);
console.log('  logo_urls (>0): ' + withLogos + '/' + m.length);
console.log('');

const byDate = {};
for (const e of m) {
  if (byDate[e.date] === undefined) byDate[e.date] = 0;
  byDate[e.date]++;
}
console.log('By date:');
for (const d of Object.keys(byDate).sort()) console.log('  ' + d + ': ' + byDate[d]);
console.log('');

const hh = m.filter(e => e.networking_signals && e.networking_signals.is_heavy_hitter);
console.log('Heavy hitters: ' + hh.length);

const stat = fs.statSync(__dirname + '/../enriched/events_official_merged.json');
console.log('File size: ' + (stat.size / 1024 / 1024).toFixed(2) + ' MB');
