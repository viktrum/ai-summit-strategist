const data = require('./comparison_data.json');
const prod = require('../production/events.json');
const xlsxOnly = data.xlsx_only_events;

// Normalize time to HH:MM format for comparison
function normalizeTime(t) {
  if (t === null || t === undefined) return null;
  const s = String(t).trim();
  // Handle "HH:MM:SS.000" or "HH:MM:SS" or "HH:MM"
  const match = s.match(/^(\d{1,2}):(\d{2})/);
  if (match) return match[1].padStart(2, '0') + ':' + match[2];
  return null;
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// Jaccard similarity on word sets
function wordSimilarity(a, b) {
  const wa = new Set(normalize(a).split(' ').filter(w => w.length > 2));
  const wb = new Set(normalize(b).split(' ').filter(w => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let intersection = 0;
  for (const w of wa) { if (wb.has(w)) intersection++; }
  return intersection / Math.max(wa.size, wb.size);
}

// Check if speakers overlap
function speakerOverlap(xlsxSpeakers, prodSpeakers) {
  if (xlsxSpeakers === null || xlsxSpeakers === undefined) return false;
  if (prodSpeakers === null || prodSpeakers === undefined) return false;
  const xa = normalize(String(xlsxSpeakers)).split(/[;,]/).map(s => s.trim()).filter(Boolean);
  const pa = normalize(String(prodSpeakers)).split(/[;,]/).map(s => s.trim()).filter(Boolean);
  if (xa.length === 0 || pa.length === 0) return false;

  for (const xs of xa) {
    for (const ps of pa) {
      // Check if last name matches (most reliable)
      const xWords = xs.split(' ').filter(w => w.length > 2);
      const pWords = ps.split(' ').filter(w => w.length > 2);
      for (const xw of xWords) {
        for (const pw of pWords) {
          if (xw === pw && xw.length > 3) return true;
        }
      }
    }
  }
  return false;
}

const generic = ['Keynote', 'Panel', 'Panel Discussion', 'Fireside Chat', 'Workshop', 'Session', 'Breakout Session', 'Break'];

let matches = [];
let confirmedNew = [];

xlsxOnly.forEach(xlsx => {
  const xlsxDate = xlsx.date;
  const xlsxTime = normalizeTime(xlsx.start_time || xlsx.time_raw);
  const xlsxTitle = xlsx.title;
  const xlsxRoom = normalize(xlsx.room || '');
  const xlsxSpeakers = xlsx.speakers || xlsx.xlsx_speakers || '';

  // Step 1: Filter production events to same date AND same start_time
  const sameDateAndTime = prod.filter(p => {
    if (p.date !== xlsxDate) return false;
    const pTime = normalizeTime(p.start_time);
    if (xlsxTime === null || pTime === null) return false;
    return pTime === xlsxTime;
  });

  if (sameDateAndTime.length === 0) {
    confirmedNew.push({ title: xlsxTitle, date: xlsxDate, time: xlsxTime, room: xlsx.room, reason: 'no production event at same date+time' });
    return;
  }

  // Step 2: Among same date+time events, check for semantic match
  let bestMatch = null;
  let bestScore = 0;
  let bestReason = '';

  for (const p of sameDateAndTime) {
    let score = 0;
    let reasons = [];

    // Title similarity
    const titleSim = wordSimilarity(xlsxTitle, p.title);
    if (titleSim > 0.5) {
      score += 3;
      reasons.push('title_sim=' + titleSim.toFixed(2));
    } else if (titleSim > 0.3) {
      score += 1;
      reasons.push('title_partial=' + titleSim.toFixed(2));
    }

    // Exact title match
    if (normalize(xlsxTitle) === normalize(p.title)) {
      score += 5;
      reasons.push('exact_title');
    }

    // Room match
    const prodRoom = normalize(p.room || '');
    if (xlsxRoom.length > 3 && prodRoom.length > 3) {
      if (xlsxRoom === prodRoom) {
        score += 2;
        reasons.push('exact_room');
      } else if (xlsxRoom.includes(prodRoom) || prodRoom.includes(xlsxRoom)) {
        score += 1;
        reasons.push('room_partial');
      }
    }

    // Speaker overlap
    if (speakerOverlap(xlsxSpeakers, p.speakers)) {
      score += 3;
      reasons.push('speaker_overlap');
    }

    // Also check xlsx description for prod speaker names
    const xlsxDesc = normalize(xlsx.description || '');
    if (p.speakers && xlsxDesc.length > 0) {
      const prodSpeakerNames = normalize(p.speakers).split(/[;,]/).map(s => s.trim()).filter(Boolean);
      for (const ps of prodSpeakerNames) {
        const lastName = ps.split(' ').filter(w => w.length > 3).pop();
        if (lastName && xlsxDesc.includes(lastName)) {
          score += 2;
          reasons.push('speaker_in_desc=' + lastName);
          break;
        }
      }
    }

    // Generic xlsx title + same room = likely match
    if (generic.indexOf(xlsxTitle) !== -1 && xlsxRoom === prodRoom && xlsxRoom.length > 3) {
      score += 3;
      reasons.push('generic_title_same_room');
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = p;
      bestReason = reasons.join(', ');
    }
  }

  if (bestScore >= 2) {
    matches.push({
      xlsx_title: xlsxTitle,
      xlsx_date: xlsxDate,
      xlsx_time: xlsxTime,
      xlsx_room: xlsx.room,
      prod_title: bestMatch.title,
      prod_id: bestMatch.event_id,
      prod_room: bestMatch.room,
      score: bestScore,
      reason: bestReason,
      candidates_at_same_time: sameDateAndTime.length
    });
  } else {
    confirmedNew.push({
      title: xlsxTitle,
      date: xlsxDate,
      time: xlsxTime,
      room: xlsx.room,
      reason: 'no semantic match (best_score=' + bestScore + ', candidates=' + sameDateAndTime.length + ')',
      candidates: sameDateAndTime.map(c => c.title.substring(0, 60)).join(' | ')
    });
  }
});

console.log('=== MATCHES FOUND (false positives in xlsx-only list) ===');
console.log('Count:', matches.length);
console.log('');
matches.forEach((m, i) => {
  console.log((i + 1) + '. XLSX: "' + m.xlsx_title + '"');
  console.log('   PROD: "' + m.prod_title + '" [' + m.prod_id + ']');
  console.log('   Date: ' + m.xlsx_date + ' | Time: ' + m.xlsx_time);
  console.log('   Rooms: xlsx=' + (m.xlsx_room || 'N/A') + ' | prod=' + (m.prod_room || 'N/A'));
  console.log('   Score: ' + m.score + ' | Reason: ' + m.reason);
  console.log('   Other events at same time: ' + m.candidates_at_same_time);
  console.log('');
});

console.log('=== CONFIRMED NEW ===');
console.log('Count:', confirmedNew.length);
console.log('');

// Show ones that had candidates but didn't match (most interesting)
const hadCandidates = confirmedNew.filter(c => c.reason.includes('candidates=') && c.candidates);
console.log('--- Had same date+time candidates but no semantic match (' + hadCandidates.length + ') ---');
hadCandidates.forEach((c, i) => {
  console.log((i + 1) + '. "' + c.title + '" (' + c.date + ' ' + c.time + ', ' + c.room + ')');
  console.log('   Nearby: ' + c.candidates);
  console.log('');
});

console.log('--- No production event at same date+time (' + (confirmedNew.length - hadCandidates.length) + ') ---');
const noMatch = confirmedNew.filter(c => c.reason === 'no production event at same date+time');

const byDate = {};
noMatch.forEach(e => {
  if (byDate[e.date] === undefined) byDate[e.date] = 0;
  byDate[e.date]++;
});
Object.keys(byDate).sort().forEach(d => console.log('  ' + d + ': ' + byDate[d]));
console.log('  Total: ' + noMatch.length);
