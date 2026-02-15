const data = require('./comparison_data.json');
const xlsxOnly = data.xlsx_only_events;
const generic = ['Keynote', 'Panel', 'Panel Discussion', 'Fireside Chat', 'Workshop', 'Session', 'Breakout Session', 'Break'];
const named = xlsxOnly.filter(e => generic.indexOf(e.title) === -1);

const byDate = {};
named.forEach(e => {
  const d = e.date || 'unknown';
  if (byDate[d] === undefined) byDate[d] = [];
  byDate[d].push(e.title);
});

console.log('=== NEW EVENTS BY DATE ===');
console.log('');
Object.keys(byDate).sort().forEach(d => {
  console.log(d + ': ' + byDate[d].length + ' new events');
  byDate[d].forEach((t, i) => console.log('  ' + (i + 1) + '. ' + t.substring(0, 100)));
  console.log('');
});

console.log('=== SUMMARY ===');
Object.keys(byDate).sort().forEach(d => {
  console.log(d + ': ' + byDate[d].length);
});
console.log('Total: ' + named.length);
