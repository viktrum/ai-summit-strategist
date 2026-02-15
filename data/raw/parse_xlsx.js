const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const xlsxPath = path.join(__dirname, 'AI Summit (Database) .xlsx');
const outputPath = path.join(__dirname, 'xlsx_parsed.json');

console.log('Reading xlsx file:', xlsxPath);

const workbook = XLSX.readFile(xlsxPath);

console.log('Sheet names:', workbook.SheetNames);

const allSheets = {};

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: null });
  allSheets[sheetName] = data;
  console.log(`\nSheet: "${sheetName}" - ${data.length} rows`);

  if (data.length > 0) {
    console.log('  Columns:', Object.keys(data[0]).join(', '));
    console.log('  Sample row 1:', JSON.stringify(data[0], null, 2).substring(0, 500));
    if (data.length > 1) {
      console.log('  Sample row 2:', JSON.stringify(data[1], null, 2).substring(0, 500));
    }
  }
}

// Write the full parsed data
fs.writeFileSync(outputPath, JSON.stringify(allSheets, null, 2));
console.log(`\nWritten to ${outputPath}`);
console.log(`Total sheets: ${workbook.SheetNames.length}`);
