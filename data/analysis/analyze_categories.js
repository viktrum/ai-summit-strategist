const data = require('./comparison_data.json');

// XLSX-only by date
const byDate = {};
data.xlsx_only_events.forEach(e => { byDate[e.date] = (byDate[e.date] || 0) + 1; });
console.log("XLSX-only by date:", JSON.stringify(byDate));

// Production-only by date
const prodByDate = {};
data.production_only_events.forEach(e => { prodByDate[e.date] = (prodByDate[e.date] || 0) + 1; });
console.log("Production-only by date:", JSON.stringify(prodByDate));

// How many xlsx-only are generic keynotes vs named sessions
const genericTitles = new Set([
  "Keynote", "Conversation", "Panel", "Break", "Panel Discussion",
  "Fireside Chat", "Fireside Conversation", "Keynote Address", "Conversation:"
]);

const generic = data.xlsx_only_events.filter(e =>
  genericTitles.has(e.title) ||
  e.title.startsWith("Lunch Break") ||
  e.title.startsWith("Break") ||
  e.title.startsWith("Poster Showcase")
);
console.log("XLSX-only generic (Keynote/Panel/Conversation/Break/Poster):", generic.length);
console.log("XLSX-only named/specific sessions:", data.xlsx_only_events.length - generic.length);

// Show named xlsx-only
const named = data.xlsx_only_events.filter(e => {
  if (genericTitles.has(e.title)) return false;
  if (e.title.startsWith("Lunch Break")) return false;
  if (e.title.startsWith("Break")) return false;
  if (e.title.startsWith("Poster Showcase")) return false;
  return true;
});
console.log("\nNamed XLSX-only events (" + named.length + "):");
named.forEach((e, i) => console.log("  " + (i+1) + ". [" + e.date + "] " + e.title));

// Show field diffs samples
console.log("\n\nFIELD DIFF SAMPLES (first 10):");
data.field_diffs.slice(0, 10).forEach((d, i) => {
  console.log("\n" + (i+1) + ". " + d.xlsx_title);
  if (d.diffs.title) console.log("   TITLE DIFF: xlsx='" + d.diffs.title.xlsx + "' prod='" + d.diffs.title.prod + "'");
  if (d.diffs.more_speakers) console.log("   MORE SPEAKERS: xlsx=" + d.diffs.more_speakers.xlsx_count + " prod=" + d.diffs.more_speakers.prod_count);
  if (d.diffs.has_end_time) console.log("   END TIME: xlsx=" + d.diffs.has_end_time.xlsx);
  if (d.diffs.longer_description) console.log("   LONGER DESC: xlsx=" + d.diffs.longer_description.xlsx_len + " prod=" + d.diffs.longer_description.prod_len);
  if (d.diffs.diff_room) console.log("   DIFF ROOM: xlsx='" + d.diffs.diff_room.xlsx + "' prod='" + d.diffs.diff_room.prod + "'");
});

// Production-only list
console.log("\n\nALL PRODUCTION-ONLY EVENTS (" + data.production_only_events.length + "):");
data.production_only_events.forEach((e, i) => {
  console.log("  " + (i+1) + ". [" + e.date + "] " + e.title + " (" + e.room + ")");
});
