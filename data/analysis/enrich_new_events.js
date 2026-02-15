const Anthropic = require("@anthropic-ai/sdk").default;
const fs = require("fs");
const path = require("path");

// ─── LOAD ENV ────────────────────────────────────────────────
const envPath = path.join(__dirname, "..", "..", ".env");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("Error: No ANTHROPIC_API_KEY found in .env");
  process.exit(1);
}

const MODEL = "claude-haiku-4-5-20251001";
const BATCH_SIZE = 8;
const DELAY_MS = 600;

const anthropic = new Anthropic({ apiKey: API_KEY });

// ─── HELPERS ─────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── ENRICHMENT PROMPT ───────────────────────────────────────
const ENRICHMENT_SYSTEM = `You are an AI conference data enrichment engine. For each event from the India AI Impact Summit (Feb 16-20, 2026), generate structured metadata.

For each event, produce ALL of these fields:

1. summary_one_liner (string): A punchy ~10-word value proposition. Max 80 chars.
2. technical_depth (int 1-5):
   1 = Policy/General audience
   2 = Leadership/Strategy
   3 = Implementation/Applied
   4 = Deep Technical/Research
   5 = Cutting-edge Research/Theory
3. target_personas (string[]): 3-5 audience types. Choose from:
   "AI Researchers", "C-Suite Executives", "Early-Stage Founders", "Government & Policy Leaders",
   "ML Engineers", "Product Managers", "Investors", "Academic Faculty", "Students",
   "Enterprise IT Leaders", "Data Scientists", "Defense & Security Leaders", "Healthcare Leaders",
   "EdTech Leaders", "AgriTech Leaders", "Telecom Leaders", "Media & Content Creators"
4. networking_signals (object):
   - is_heavy_hitter (boolean): true if speakers are from FAANG, OpenAI, Anthropic, top-tier VCs, government ministers, or globally renowned researchers (Bill Gates, Sam Altman, Sundar Pichai, Demis Hassabis, Yann LeCun, etc.)
   - decision_maker_density: "High" | "Medium" | "Low"
   - investor_presence: "Likely" | "Unlikely"
5. keywords (array of objects): 3-5 keyword objects, each with:
   - category: one of "AI Governance & Ethics", "Core AI Technology", "Industry Applications", "Infrastructure & Compute", "Social Impact & Inclusion", "Specialized AI Domains", "Startup & Innovation"
   - keyword: specific topic tag
6. goal_relevance (string[]): 1-3 from ONLY: "fundraising", "hiring", "sales", "upskilling", "networking"
7. icebreaker (string): One specific, natural conversation starter. Use a speaker's name if available. Under 120 chars.
8. networking_tip (string): One tactical tip for maximizing this event. Under 120 chars.

Output ONLY a JSON array. No markdown, no explanation. Each item must have all 8 fields plus an "xlsx_id" field matching the input.`;

async function callClaude(system, user, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: user }],
      });
      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found in response");
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      if (attempt < retries) {
        console.log(`  Retry ${attempt + 1}/${retries}: ${err.message}`);
        await sleep(2000);
      } else {
        throw err;
      }
    }
  }
}

// ─── MAIN ────────────────────────────────────────────────────
async function main() {
  const mergedPath = path.join(__dirname, "..", "enriched", "events_merged_v2.json");
  const merged = JSON.parse(fs.readFileSync(mergedPath, "utf8"));

  // Find events needing enrichment
  const needsEnrichment = merged.filter(e => e.source === "xlsx_only" && !e.summary_one_liner);

  console.log("========================================");
  console.log("  Enriching XLSX-only events");
  console.log("========================================");
  console.log(`Events to enrich: ${needsEnrichment.length}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Estimated API calls: ~${Math.ceil(needsEnrichment.length / BATCH_SIZE)}`);
  console.log(`Model: ${MODEL}`);
  console.log("");

  const batches = chunk(needsEnrichment, BATCH_SIZE);
  const results = {};
  let done = 0;
  let apiErrors = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const compact = batch.map(e => ({
      xlsx_id: e.event_id,
      title: e.title,
      description: (e.description || "").slice(0, 300),
      speakers: e.speakers || (e.xlsx_speakers ? e.xlsx_speakers.join("; ") : "Not listed"),
      date: e.date,
      venue: e.venue,
      room: e.room,
    }));

    try {
      const enriched = await callClaude(
        ENRICHMENT_SYSTEM,
        `Enrich these ${batch.length} events from the India AI Impact Summit:\n${JSON.stringify(compact)}`
      );

      for (const item of enriched) {
        if (item.xlsx_id) {
          results[item.xlsx_id] = item;
        }
      }

      done += batch.length;
      console.log(`  Batch ${i + 1}/${batches.length} done (${done}/${needsEnrichment.length})`);
    } catch (err) {
      console.error(`  Batch ${i + 1} FAILED: ${err.message}`);
      apiErrors++;

      // Provide defaults for failed batches
      for (const e of batch) {
        results[e.event_id] = {
          xlsx_id: e.event_id,
          summary_one_liner: `${e.title.slice(0, 60)}`,
          technical_depth: 2,
          target_personas: ["Government & Policy Leaders", "C-Suite Executives"],
          networking_signals: {
            is_heavy_hitter: false,
            decision_maker_density: "Medium",
            investor_presence: "Unlikely",
          },
          keywords: [
            { category: "AI Governance & Ethics", keyword: "AI Policy" },
            { category: "Social Impact & Inclusion", keyword: "Inclusive AI" },
          ],
          goal_relevance: ["networking"],
          icebreaker: `What's your take on ${e.title.slice(0, 50)}?`,
          networking_tip: "Arrive early for best seating and networking.",
        };
      }
      done += batch.length;
    }

    if (i < batches.length - 1) await sleep(DELAY_MS);
  }

  // Merge enrichment back into merged events
  let enrichedCount = 0;
  for (const event of merged) {
    if (event.source !== "xlsx_only") continue;

    const enrichment = results[event.event_id];
    if (enrichment) {
      event.summary_one_liner = enrichment.summary_one_liner;
      event.technical_depth = enrichment.technical_depth;
      event.target_personas = enrichment.target_personas;
      event.networking_signals = enrichment.networking_signals;
      event.keywords = enrichment.keywords;
      event.goal_relevance = enrichment.goal_relevance;
      event.icebreaker = enrichment.icebreaker;
      event.networking_tip = enrichment.networking_tip;
      enrichedCount++;
    }
  }

  // Write updated merged file
  fs.writeFileSync(mergedPath, JSON.stringify(merged, null, 2));

  console.log("\n========================================");
  console.log(`  Enriched: ${enrichedCount}/${needsEnrichment.length}`);
  console.log(`  API errors: ${apiErrors}`);
  console.log(`  Updated: events_merged_v2.json`);
  console.log("========================================");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
