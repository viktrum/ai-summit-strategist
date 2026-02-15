const https = require('https');

const DATE = '2026-02-18';

function fetchPage(page) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify([{ date: DATE }, { page, pageSize: 25 }, '']);
    const options = {
      hostname: 'impact.indiaai.gov.in',
      path: '/sessions?date=' + DATE,
      method: 'POST',
      headers: {
        'next-action': '7fd748a90df2d2c23451daab274abf764ea226805b',
        'Referer': 'https://impact.indiaai.gov.in/sessions?date=' + DATE,
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
  // The response has lines like 0:{...} and 1:{...}
  const lines = raw.split('\n');
  for (const line of lines) {
    const match = line.match(/^1:(.*)/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        // Try to extract sessions array
      }
    }
  }
  return null;
}

async function main() {
  const allSessions = [];

  for (let page = 1; page <= 10; page++) {
    const raw = await fetchPage(page);
    const parsed = parseResponse(raw);
    if (parsed === null || parsed.sessions === undefined || parsed.sessions.length === 0) break;
    allSessions.push(...parsed.sessions);
    console.error('Page ' + page + ': ' + parsed.sessions.length + ' sessions');
    if (parsed.sessions.length < 25) break;
  }

  console.error('Total official sessions for ' + DATE + ': ' + allSessions.length);

  // Load production and xlsx data
  const prod = require('../production/events.json').filter(e => e.date === DATE);
  const compData = require('./comparison_data.json');
  const xlsxOnly = compData.xlsx_only_events.filter(e => e.date === DATE);

  console.error('Production events for ' + DATE + ': ' + prod.length);
  console.error('XLSX-only events for ' + DATE + ': ' + xlsxOnly.length);

  // Normalize for matching
  function norm(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  }

  function normalizeTime(t) {
    if (t === null || t === undefined) return null;
    const m = String(t).match(/(\d{1,2}):(\d{2})/);
    if (m) return m[1].padStart(2, '0') + ':' + m[2];
    return null;
  }

  // Check each official session against production
  const results = [];
  for (const official of allSessions) {
    const oTitle = norm(official.title);
    const oTime = normalizeTime(official.startTime);

    // Check production
    let inProd = prod.find(p => norm(p.title) === oTitle);
    if (inProd === undefined) {
      // Fuzzy: first 40 chars
      const sub = oTitle.substring(0, 40);
      inProd = prod.find(p => norm(p.title).includes(sub));
    }

    // Check xlsx-only
    let inXlsx = xlsxOnly.find(x => norm(x.title) === oTitle);
    if (inXlsx === undefined) {
      const sub = oTitle.substring(0, 40);
      inXlsx = xlsxOnly.find(x => norm(x.title).includes(sub));
    }

    results.push({
      title: official.title,
      time: official.formattedStartTime + ' - ' + official.formattedEndTime,
      room: official.auditorium,
      in_production: inProd !== undefined ? inProd.event_id : null,
      in_xlsx_only: inXlsx !== undefined ? true : false,
      status: inProd !== undefined ? 'IN_PROD' : (inXlsx !== undefined ? 'IN_XLSX_ONLY' : 'MISSING_BOTH'),
    });
  }

  // Summary
  const inProd = results.filter(r => r.status === 'IN_PROD');
  const inXlsx = results.filter(r => r.status === 'IN_XLSX_ONLY');
  const missing = results.filter(r => r.status === 'MISSING_BOTH');

  console.log('=== OFFICIAL SITE vs OUR DATA for ' + DATE + ' ===');
  console.log('Official site total: ' + allSessions.length);
  console.log('In our production: ' + inProd.length);
  console.log('In xlsx-only (new from xlsx): ' + inXlsx.length);
  console.log('MISSING FROM BOTH: ' + missing.length);
  console.log('');

  console.log('--- IN PRODUCTION (' + inProd.length + ') ---');
  inProd.forEach((r, i) => console.log((i + 1) + '. ' + r.title.substring(0, 80) + ' [' + r.time + ']'));

  console.log('');
  console.log('--- IN XLSX ONLY (' + inXlsx.length + ') ---');
  inXlsx.forEach((r, i) => console.log((i + 1) + '. ' + r.title.substring(0, 80) + ' [' + r.time + ']'));

  console.log('');
  console.log('--- MISSING FROM BOTH (' + missing.length + ') ---');
  missing.forEach((r, i) => console.log((i + 1) + '. ' + r.title.substring(0, 80) + ' [' + r.time + '] Room: ' + r.room));
}

main().catch(console.error);
