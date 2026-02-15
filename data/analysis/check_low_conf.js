const fs = require('fs');
const path = require('path');

const official = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'raw', 'official_site_scraped.json'), 'utf8')
);
const production = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'production', 'events.json'), 'utf8')
);

// The 11 low-confidence pairs from v2 — check speakers for each
const pairs = [
  { oTitle: 'Genomics, AI, and the Future of Health', pTitle: 'The Future of Frontier AI and Cybersecurity' },
  { oTitle: 'The Future of Frontier AI and Cybersecurity', pTitle: 'The Future is Intelligent: AI in the Cloud-Native Era' },
  { oTitle: 'The Role of AI in Drug Discovery', pTitle: 'AI-DPI Experimentation and the Role of Sandboxes' },
  { oTitle: 'Policies for Social and Economic Resilience', pTitle: 'Driving Financial Resilience and Sustainable Impact' },
  { oTitle: 'Practical Pathways for Operationalizing Safe', pTitle: 'Trusted AI: Practical Pathways for the Public Sector' },
  { oTitle: 'Fireside Conversation', pTitle: 'Fireside Chat' },
  { oTitle: 'Panel: Data Sovereignty', pTitle: 'Panel Discussion' },
  { oTitle: 'Panel: AI in Science', pTitle: 'Panel Discussion' },
  { oTitle: 'Fireside Chat', pTitle: 'AI for Economic Growth and Social Good' },
  { oTitle: 'Panel Discussion', pTitle: 'Panel Discussion: Reimagining AI and STEM' },
];

function norm(s) { return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim(); }

for (let i = 0; i < pairs.length; i++) {
  const p = pairs[i];
  const oEvent = official.find(o => norm(o.title).includes(norm(p.oTitle).substring(0, 30)));
  const pEvent = production.find(pr => norm(pr.title).includes(norm(p.pTitle).substring(0, 30)));

  console.log((i + 1) + '. OFFI: ' + (oEvent ? oEvent.title.substring(0, 65) : 'NOT FOUND'));
  if (oEvent) {
    console.log('   O-Speakers: ' + (oEvent.speakers || []).slice(0, 3).join('; ').substring(0, 100));
    console.log('   O-Date: ' + oEvent.date + ' | O-Time: ' + (oEvent.start_time || 'N/A') + ' | O-Room: ' + (oEvent.room || 'N/A'));
  }
  console.log('   PROD: ' + (pEvent ? pEvent.title.substring(0, 65) : 'NOT FOUND'));
  if (pEvent) {
    console.log('   P-Speakers: ' + (pEvent.speakers || '').substring(0, 100));
    console.log('   P-Date: ' + pEvent.date + ' | P-Time: ' + (pEvent.start_time || 'N/A') + ' | P-Room: ' + (pEvent.room || 'N/A'));
  }

  // Speaker overlap
  if (oEvent && pEvent) {
    const oNames = (oEvent.speakers || []).map(s => s.split(',')[0].trim().split(/\s+/).pop().toLowerCase());
    const pNames = (pEvent.speakers || '').split(';').map(s => s.trim().split(/\s+/).pop().toLowerCase());
    const overlap = oNames.filter(n => n.length > 3 && pNames.includes(n));
    console.log('   Speaker overlap: ' + overlap.join(', ') + (overlap.length === 0 ? '(NONE)' : ''));
  }
  console.log('');
}
