const data = require('../analysis/comparison_data.json');
const prod = require('../production/events.json');
const xlsxOnly = data.xlsx_only_events;
const generic = ['Keynote', 'Panel', 'Panel Discussion', 'Fireside Chat', 'Workshop', 'Session', 'Breakout Session'];
const named = xlsxOnly.filter(e => generic.indexOf(e.title) === -1);

let falsePositives = [];
let confirmed = [];

named.forEach(xlsx => {
  const xlsxTitle = xlsx.title.toLowerCase().trim();
  // Check exact match
  let match = prod.find(p => p.title.toLowerCase().trim() === xlsxTitle);
  if (match === undefined) {
    // Check substring (first 40 chars)
    const sub = xlsxTitle.substring(0, Math.min(40, xlsxTitle.length));
    match = prod.find(p => {
      const pt = p.title.toLowerCase();
      return pt.includes(sub) || xlsxTitle.includes(pt.substring(0, 40));
    });
  }
  if (match !== undefined) {
    falsePositives.push({
      xlsx_title: xlsx.title,
      xlsx_date: xlsx.date,
      prod_title: match.title,
      prod_date: match.date,
      prod_id: match.event_id
    });
  } else {
    confirmed.push({ title: xlsx.title, date: xlsx.date, room: xlsx.room || 'N/A' });
  }
});

console.log('=== FALSE POSITIVES (exist in production but marked xlsx-only) ===');
console.log('Count:', falsePositives.length);
falsePositives.forEach((fp, i) => {
  console.log('');
  console.log((i + 1) + '. XLSX: ' + fp.xlsx_title);
  console.log('   PROD: ' + fp.prod_title + ' [' + fp.prod_id + ']');
  console.log('   Dates: xlsx=' + fp.xlsx_date + ' prod=' + fp.prod_date);
});

console.log('');
console.log('=== CONFIRMED NEW (truly not in production) ===');
console.log('Count:', confirmed.length);
confirmed.slice(0, 20).forEach((c, i) => {
  console.log((i + 1) + '. ' + c.title + ' (' + c.date + ', ' + c.room + ')');
});
if (confirmed.length > 20) {
  console.log('... and ' + (confirmed.length - 20) + ' more');
}
