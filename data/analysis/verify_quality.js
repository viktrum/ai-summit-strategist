const data = require('../enriched/events_merged_v2.json');

// Show 3 sample xlsx_only enriched events
const xlsxOnly = data.filter(e => e.source === "xlsx_only");
console.log("Sample enriched xlsx-only events:\n");

[0, 50, 100].forEach(i => {
  if (xlsxOnly[i]) {
    const e = xlsxOnly[i];
    console.log("---");
    console.log("Title:", e.title);
    console.log("Date:", e.date);
    console.log("One-liner:", e.summary_one_liner);
    console.log("Depth:", e.technical_depth);
    console.log("Personas:", JSON.stringify(e.target_personas));
    console.log("Networking:", JSON.stringify(e.networking_signals));
    console.log("Keywords:", JSON.stringify(e.keywords));
    console.log("Goal:", JSON.stringify(e.goal_relevance));
    console.log("Icebreaker:", e.icebreaker);
    console.log("Tip:", e.networking_tip);
    console.log("Logos:", e.logo_urls ? e.logo_urls.length : 0);
    console.log("");
  }
});

// Show a matched event with end_time added
const matched = data.filter(e => e.source === "both" && e.end_time);
if (matched[0]) {
  console.log("--- MATCHED with end_time ---");
  console.log("Title:", matched[0].title);
  console.log("Start:", matched[0].start_time);
  console.log("End:", matched[0].end_time);
  console.log("Has xlsx_time_raw:", matched[0].xlsx_time_raw ? "yes" : "no");
}

// Verify no null enrichments
const nullEnrichment = data.filter(e => e.summary_one_liner === null || e.summary_one_liner === undefined);
console.log("\nEvents without enrichment:", nullEnrichment.length);

// Stats
console.log("\nFull stats:");
console.log("  Total events:", data.length);
console.log("  Both:", data.filter(e => e.source === "both").length);
console.log("  Production only:", data.filter(e => e.source === "production_only").length);
console.log("  XLSX only:", data.filter(e => e.source === "xlsx_only").length);
console.log("  With end_time:", data.filter(e => e.end_time).length);
console.log("  With logos:", data.filter(e => e.logo_urls && e.logo_urls.length > 0).length);
console.log("  Heavy hitters:", data.filter(e => e.networking_signals && e.networking_signals.is_heavy_hitter).length);

// By date
const byDate = {};
data.forEach(e => {
  const key = e.date + " (" + e.source + ")";
  byDate[key] = (byDate[key] || 0) + 1;
});
console.log("\nBy date + source:");
Object.keys(byDate).sort().forEach(k => {
  console.log("  " + k + ": " + byDate[k]);
});
