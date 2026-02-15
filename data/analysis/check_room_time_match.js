const fs = require('fs');
const path = require('path');
const official = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'raw', 'official_site_scraped.json'), 'utf8'));
const production = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'production', 'events.json'), 'utf8'));
const sourceMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'merge_source_map.json'), 'utf8'));

const prodOnly = production.filter(p => sourceMap.details[p.event_id] === 'production_only');

function norm(s) { return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim(); }
function normTime(t) {
  if (t === null || t === undefined) return null;
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? m[1].padStart(2,'0') + ':' + m[2] : null;
}

let roomTimeMatches = 0;
let roomOnlyMatches = 0;
let noMatch = 0;
const roomTimeDetails = [];

// Track which official events get matched this way
const officialUsed = new Set();

for (const p of prodOnly) {
  const pTime = normTime(p.start_time);
  const pRoom = norm(p.room);
  const sameDateOfficial = official.filter(o => o.date === p.date);

  // Same date + time + room
  const sameTimeRoom = sameDateOfficial.find(o => {
    if (officialUsed.has(o.official_id)) return false;
    const oTime = normTime(o.start_time);
    const oRoom = norm(o.room);
    return oTime && pTime && oTime === pTime && oRoom && pRoom && oRoom === pRoom;
  });

  if (sameTimeRoom) {
    roomTimeMatches++;
    officialUsed.add(sameTimeRoom.official_id);
    roomTimeDetails.push({
      prod_title: p.title.substring(0, 75),
      official_title: sameTimeRoom.title.substring(0, 75),
      date: p.date,
      time: pTime,
      room: p.room,
      event_id: p.event_id,
      official_id: sameTimeRoom.official_id,
    });
  } else {
    const sameRoom = sameDateOfficial.find(o => norm(o.room) === pRoom && pRoom);
    if (sameRoom) { roomOnlyMatches++; }
    else { noMatch++; }
  }
}

console.log('=== MATCHING PROD-ONLY BY DATE+TIME+ROOM ===');
console.log('Same date+time+room: ' + roomTimeMatches + ' (high confidence — likely renamed events)');
console.log('Same room, different time: ' + roomOnlyMatches);
console.log('No room match at all: ' + noMatch);
console.log('Total prod-only: ' + prodOnly.length);
console.log('');

console.log('=== ALL ROOM+TIME MATCHES ===');
roomTimeDetails.forEach((m, i) => {
  console.log((i+1) + '. PROD: ' + m.prod_title);
  console.log('   OFFI: ' + m.official_title);
  console.log('   ' + m.date + ' ' + m.time + ' | ' + m.room);
  console.log('');
});

// Save for merge improvement
fs.writeFileSync(
  path.join(__dirname, 'room_time_matches.json'),
  JSON.stringify(roomTimeDetails, null, 2)
);
console.log('Saved room_time_matches.json');
