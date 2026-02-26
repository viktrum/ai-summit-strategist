const Anthropic = require("@anthropic-ai/sdk").default;
const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM = `You enrich AI conference event data. For each event, generate exactly 3 fields.

Rules:
- goal_relevance: Pick 1-3 from ONLY: "fundraising", "hiring", "sales", "upskilling", "networking"
- icebreaker: One specific, natural conversation starter. Use speaker name if available. Under 120 chars.
- networking_tip: One tactical tip for this event. Under 120 chars.

Output ONLY a JSON array. Each item: { "id": N, "goal_relevance": [...], "icebreaker": "...", "networking_tip": "..." }`;

async function main() {
  const sessions = JSON.parse(fs.readFileSync("./sessions_enriched_v2.json", "utf8"));

  // Find the 49 events that got defaults (null event_id = ones that were missed)
  const missed = sessions.filter(e =>
    e.icebreaker.startsWith("Explore insights on") ||
    e.icebreaker.startsWith("Ask about ")
  );
  console.log(`Found ${missed.length} events needing enrichment (matched by default icebreaker)`);

  if (missed.length === 0) {
    console.log("Nothing to fix!");
    return;
  }

  // Batch them (all 49 in ~5 batches of 10)
  const batchSize = 10;
  const results = {};

  for (let i = 0; i < missed.length; i += batchSize) {
    const batch = missed.slice(i, i + batchSize);
    const compact = batch.map(e => ({
      id: e.id,
      title: e.title,
      description: (e.description || "").slice(0, 200),
      speakers: e.speakers || "Not listed",
      keywords: e.keywords,
      target_personas: e.target_personas,
      technical_depth: e.technical_depth,
      is_heavy_hitter: e.networking_signals?.is_heavy_hitter || false,
    }));

    try {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM,
        messages: [{ role: "user", content: `Enrich these ${batch.length} events:\n${JSON.stringify(compact)}` }],
      });

      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const enriched = JSON.parse(jsonMatch[0]);
        for (const item of enriched) {
          if (item.id) results[item.id] = item;
        }
      }
      console.log(`  Batch ${Math.floor(i / batchSize) + 1} done`);
    } catch (err) {
      console.error(`  Batch failed: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // Merge back using `id` field (not event_id)
  let fixed = 0;
  for (const session of sessions) {
    const enrichment = results[session.id];
    if (enrichment) {
      session.goal_relevance = enrichment.goal_relevance;
      session.icebreaker = enrichment.icebreaker;
      session.networking_tip = enrichment.networking_tip;
      fixed++;
    }
  }

  fs.writeFileSync("./sessions_enriched_v2.json", JSON.stringify(sessions, null, 2));
  console.log(`\n✓ Fixed ${fixed}/${missed.length} events`);
  console.log("  Updated sessions_enriched_v2.json");
}

main().catch(err => { console.error(err); process.exit(1); });
