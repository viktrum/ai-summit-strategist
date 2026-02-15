const fs = require('fs');
const path = require('path');

const official = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'raw', 'official_site_scraped.json'), 'utf8')
);
const production = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'production', 'events.json'), 'utf8')
);
const merged = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'enriched', 'events_official_merged.json'), 'utf8')
);
const sourceMap = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'merge_source_map.json'), 'utf8')
);

function norm(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// Extract last names from speaker strings
function getLastNames(speakerStr) {
  if (!speakerStr) return new Set();
  return new Set(
    speakerStr.split(';').map(s => {
      const name = s.split(',')[0].trim();
      const parts = name.split(/\s+/);
      return parts[parts.length - 1].toLowerCase();
    }).filter(n => n.length > 2)
  );
}

// For each matched event, check if the icebreaker references a speaker no longer in the official list
const matched = merged.filter(e => sourceMap.details[e.event_id] === 'matched');
console.log('Matched events (with production enrichment): ' + matched.length);

let staleIcebreakers = 0;
const staleList = [];

for (const event of matched) {
  if (!event.icebreaker) continue;

  // Get current speaker last names from the merged event (official site data)
  const currentSpeakers = getLastNames(event.speakers);

  // Check if icebreaker mentions a name not in current speakers
  const iceLower = event.icebreaker.toLowerCase();

  // Find the production version to get old speakers
  const prodEvent = production.find(p => p.event_id === event.event_id);
  if (!prodEvent) continue;

  const oldSpeakers = getLastNames(prodEvent.speakers);

  // Names in old but not in current
  const removedSpeakers = [...oldSpeakers].filter(n => !currentSpeakers.has(n));

  // Check if icebreaker mentions any removed speaker
  const mentionedRemoved = removedSpeakers.filter(name => iceLower.includes(name));

  if (mentionedRemoved.length > 0) {
    staleIcebreakers++;
    staleList.push({
      event_id: event.event_id,
      id: event.id,
      title: event.title.substring(0, 70),
      old_speakers: prodEvent.speakers.substring(0, 100),
      new_speakers: event.speakers.substring(0, 100),
      icebreaker: event.icebreaker,
      stale_names: mentionedRemoved,
    });
  }
}

console.log('Stale icebreakers (reference removed speakers): ' + staleIcebreakers);
console.log('');

staleList.forEach((s, i) => {
  console.log((i+1) + '. [id:' + s.id + '] ' + s.title);
  console.log('   Stale names: ' + s.stale_names.join(', '));
  console.log('   Icebreaker: ' + s.icebreaker);
  console.log('   Old speakers: ' + s.old_speakers);
  console.log('   New speakers: ' + s.new_speakers);
  console.log('');
});

// Also check: how many matched events have different speaker lists at all?
let speakerChanged = 0;
for (const event of matched) {
  const prodEvent = production.find(p => p.event_id === event.event_id);
  if (!prodEvent) continue;
  if (norm(event.speakers) !== norm(prodEvent.speakers)) speakerChanged++;
}
console.log('Total matched events with changed speakers: ' + speakerChanged + '/' + matched.length);

// Save stale list for re-enrichment
fs.writeFileSync(
  path.join(__dirname, 'stale_icebreaker_events.json'),
  JSON.stringify(staleList, null, 2)
);
