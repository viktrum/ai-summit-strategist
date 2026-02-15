const https = require('https');
const fs = require('fs');
const path = require('path');

const DATES = ['2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20'];

function fetchPage(date, page) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify([{ date }, { page, pageSize: 25 }, '']);
    const options = {
      hostname: 'impact.indiaai.gov.in',
      path: '/sessions?date=' + date,
      method: 'POST',
      headers: {
        'next-action': '7fd748a90df2d2c23451daab274abf764ea226805b',
        'Referer': 'https://impact.indiaai.gov.in/sessions?date=' + date,
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/x-component',
        'Content-Type': 'text/plain;charset=UTF-8',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseResponse(raw) {
  const lines = raw.split('\n');
  for (const line of lines) {
    const match = line.match(/^1:(.*)/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e) { /* skip */ }
    }
  }
  return null;
}

function normalizeTime(t) {
  if (t === null || t === undefined) return null;
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  if (m) return m[1].padStart(2, '0') + ':' + m[2];
  return null;
}

async function main() {
  const allSessions = [];
  const byDate = {};

  for (const date of DATES) {
    byDate[date] = [];
    for (let page = 1; page <= 20; page++) {
      console.error('Fetching ' + date + ' page ' + page + '...');
      const raw = await fetchPage(date, page);
      const parsed = parseResponse(raw);
      if (parsed === null || parsed.sessions === undefined || parsed.sessions.length === 0) break;

      for (const s of parsed.sessions) {
        const event = {
          official_id: s.id,
          title: s.title,
          description: s.description || null,
          date: s.date,
          start_time: s.startTime || null,
          end_time: s.endTime || null,
          formatted_start: s.formattedStartTime || null,
          formatted_end: s.formattedEndTime || null,
          venue: s.venue || null,
          room: (s.auditorium || '').trim() || null,
          speakers: (s.speakers || []).map(sp => sp.heading).filter(Boolean),
          knowledge_partners: (s.knowledgePartners || []).map(kp => kp.heading || kp.name).filter(Boolean),
          heading: s.heading || null,
          sub_heading: s.subHeading || null,
          description_title: s.descriptionTitle || null,
          tags: (s.buttons && s.buttons.tagButtons) ? s.buttons.tagButtons.map(t => t.name) : [],
          watch_live_url: (s.buttons && s.buttons.watchLiveButton && s.buttons.watchLiveButton.length > 0) ? s.buttons.watchLiveButton[0].url : null,
        };
        allSessions.push(event);
        byDate[date].push(event);
      }

      if (parsed.sessions.length < 25) break;
      // Small delay to be nice to the server
      await new Promise(r => setTimeout(r, 500));
    }
    console.error(date + ': ' + byDate[date].length + ' sessions');
  }

  console.error('');
  console.error('=== TOTAL ===');
  console.error('Total sessions from official site: ' + allSessions.length);
  for (const d of DATES) {
    console.error('  ' + d + ': ' + byDate[d].length);
  }

  // Save raw scraped data
  const outPath = path.join(__dirname, '..', 'raw', 'official_site_scraped.json');
  fs.writeFileSync(outPath, JSON.stringify(allSessions, null, 2));
  console.error('Saved to: ' + outPath);

  // Now compare against production
  const prod = require('../production/events.json');
  console.error('Production events: ' + prod.length);

  function norm(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  }

  let inProd = 0;
  let notInProd = 0;
  const missing = [];

  for (const official of allSessions) {
    const oTitle = norm(official.title);
    const oDate = official.date;

    // Match by date first, then title
    const sameDateProd = prod.filter(p => p.date === oDate);
    let found = sameDateProd.find(p => norm(p.title) === oTitle);
    if (found === undefined) {
      // Fuzzy: first 40 chars
      const sub = oTitle.substring(0, Math.min(40, oTitle.length));
      if (sub.length > 10) {
        found = sameDateProd.find(p => norm(p.title).includes(sub) || oTitle.includes(norm(p.title).substring(0, 40)));
      }
    }

    if (found !== undefined) {
      inProd++;
    } else {
      notInProd++;
      missing.push(official);
    }
  }

  console.log('');
  console.log('=== COMPARISON: OFFICIAL SITE vs PRODUCTION ===');
  console.log('Official site total: ' + allSessions.length);
  console.log('Already in production: ' + inProd);
  console.log('NOT in production: ' + notInProd);
  console.log('');

  // Break down missing by date
  const missingByDate = {};
  for (const m of missing) {
    if (missingByDate[m.date] === undefined) missingByDate[m.date] = [];
    missingByDate[m.date].push(m);
  }

  for (const d of DATES) {
    const arr = missingByDate[d] || [];
    console.log('--- ' + d + ' (' + arr.length + ' missing) ---');
    arr.forEach((m, i) => {
      const speakers = m.speakers.slice(0, 2).join('; ');
      console.log('  ' + (i + 1) + '. ' + m.title.substring(0, 80));
      console.log('     ' + (m.formatted_start || '') + ' - ' + (m.formatted_end || '') + ' | ' + (m.room || 'N/A'));
      if (speakers) console.log('     Speakers: ' + speakers.substring(0, 100));
    });
    console.log('');
  }

  // Save missing events
  const missingPath = path.join(__dirname, 'official_site_missing_from_prod.json');
  fs.writeFileSync(missingPath, JSON.stringify(missing, null, 2));
  console.error('Missing events saved to: ' + missingPath);
}

main().catch(console.error);
