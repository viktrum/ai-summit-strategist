const fs = require('fs');

const html = fs.readFileSync('./expo list.html', 'utf8');

const exhibitors = [];
const cardRegex = /<div class="exhibitor-cards">\s*<div class="exhibitor-logo">\s*<img src="([^"]*)" alt="([^"]*)">\s*<\/div>\s*<div class="exhibitor-footer[^"]*">\s*<strong>([^<]*)<\/strong>/g;

let match;
let id = 1;

while ((match = cardRegex.exec(html)) !== null) {
  const logoUrl = match[1];
  const altText = match[2].trim();
  const name = match[3].trim().replace(/&amp;/g, '&');

  exhibitors.push({
    id: id++,
    name: name,
    logo_url: logoUrl,
    alt_text: altText,
  });
}

console.log(`Extracted ${exhibitors.length} exhibitors`);

// Show a few samples
console.log('\nFirst 5:');
exhibitors.slice(0, 5).forEach(e => console.log(`  ${e.id}. ${e.name}`));
console.log('\nLast 5:');
exhibitors.slice(-5).forEach(e => console.log(`  ${e.id}. ${e.name}`));

fs.writeFileSync('./expolist.json', JSON.stringify(exhibitors, null, 2));
console.log('\nSaved to expolist.json');
