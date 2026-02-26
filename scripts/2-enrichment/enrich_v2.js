const Anthropic = require("@anthropic-ai/sdk").default;
const fs = require("fs");
const path = require("path");

// ─── CONFIG ───────────────────────────────────────────────
// Load .env file
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
}

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY || API_KEY === "your-key-here") {
  console.error("Error: Add your Anthropic API key to .env file");
  console.error("  Edit .env and replace 'your-key-here' with your actual key");
  process.exit(1);
}

const MODEL = "claude-haiku-4-5-20251001";
const SESSION_BATCH_SIZE = 10;
const EXPO_BATCH_SIZE = 25;
const DELAY_MS = 500; // rate limit buffer

const anthropic = new Anthropic({ apiKey: API_KEY });

// ─── HELPERS ──────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

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
      // Extract JSON from response (handle markdown code blocks)
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

// ─── SESSION ENRICHMENT ───────────────────────────────────
const SESSION_SYSTEM = `You enrich AI conference event data. For each event, generate exactly 3 fields based on the event's title, description, speakers, and existing metadata.

Rules:
- goal_relevance: Pick 1-3 from ONLY these values: "fundraising", "hiring", "sales", "upskilling", "networking"
  Think about WHO attends this event and WHAT they'd want. A VC panel = "fundraising". A skills workshop = "upskilling". A keynote by a famous person = "networking".
- icebreaker: One specific, natural conversation starter. MUST use a speaker's name if available. Reference the actual topic. Keep it under 120 chars. No generic "tell me about your work" — make it specific to THIS event.
- networking_tip: One tactical tip for maximizing this specific event. Consider: room size, speaker accessibility, crowd type, timing. Keep it under 120 chars.

Output ONLY a JSON array. No markdown, no explanation. Each item must have: { "event_id": "...", "goal_relevance": [...], "icebreaker": "...", "networking_tip": "..." }`;

async function enrichSessions() {
  const sessions = JSON.parse(
    fs.readFileSync("./sessions_enriched_clean.json", "utf8")
  );
  console.log(`\n━━━ SESSION ENRICHMENT ━━━`);
  console.log(`Events: ${sessions.length}, Batch size: ${SESSION_BATCH_SIZE}`);

  const batches = chunk(sessions, SESSION_BATCH_SIZE);
  const results = {};
  let done = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const compact = batch.map((e) => ({
      event_id: e.event_id,
      title: e.title,
      description: (e.description || "").slice(0, 200),
      speakers: e.speakers || "Not listed",
      keywords: e.keywords,
      target_personas: e.target_personas,
      technical_depth: e.technical_depth,
      is_heavy_hitter: e.networking_signals?.is_heavy_hitter || false,
      decision_maker_density:
        e.networking_signals?.decision_maker_density || "Low",
    }));

    try {
      const enriched = await callClaude(
        SESSION_SYSTEM,
        `Enrich these ${batch.length} events:\n${JSON.stringify(compact)}`
      );

      for (const item of enriched) {
        if (item.event_id) results[item.event_id] = item;
      }

      done += batch.length;
      console.log(
        `  Batch ${i + 1}/${batches.length} done (${done}/${sessions.length})`
      );
    } catch (err) {
      console.error(`  Batch ${i + 1} FAILED: ${err.message}`);
      // Mark failed events with defaults
      for (const e of batch) {
        results[e.event_id] = {
          event_id: e.event_id,
          goal_relevance: ["networking"],
          icebreaker: `Ask about ${e.title.slice(0, 50)}`,
          networking_tip: "Arrive early for best seating and networking.",
        };
      }
      done += batch.length;
    }

    if (i < batches.length - 1) await sleep(DELAY_MS);
  }

  // Merge back into sessions
  let enrichedCount = 0;
  for (const session of sessions) {
    const enrichment = results[session.event_id];
    if (enrichment) {
      session.goal_relevance = enrichment.goal_relevance;
      session.icebreaker = enrichment.icebreaker;
      session.networking_tip = enrichment.networking_tip;
      enrichedCount++;
    } else {
      session.goal_relevance = ["networking"];
      session.icebreaker = `Explore insights on ${session.keywords?.[0] || session.title.slice(0, 40)}`;
      session.networking_tip =
        "Arrive early for best seating and networking.";
    }
  }

  fs.writeFileSync(
    "./sessions_enriched_v2.json",
    JSON.stringify(sessions, null, 2)
  );
  console.log(
    `✓ Sessions enriched: ${enrichedCount}/${sessions.length} via AI, rest defaulted`
  );
  console.log(`  Saved to sessions_enriched_v2.json`);
  return sessions;
}

// ─── EXPO ENRICHMENT ──────────────────────────────────────
const EXPO_SYSTEM = `You enrich exhibitor data for an AI conference expo. You receive exhibitor names and must infer what they do.

For each exhibitor generate:
- keywords: 3-5 relevant topic tags. Use terms like: "AI infrastructure", "enterprise AI", "healthcare AI", "AI governance", "cloud computing", "edge computing", "generative AI", "data governance", "cybersecurity", "digital public infrastructure", "AI skilling", "startup ecosystem", "semiconductor", "telecom", "fintech", "agritech", "edtech", "defense AI", "sovereign AI", "responsible AI". Pick what fits.
- target_personas: 3-5 types of people who should visit this booth. Use terms like: "ML Engineers", "C-Suite Executives", "Startup Founders", "Government Officials", "Investors", "Researchers", "Product Managers", "Policy Makers", "Students", "Enterprise IT Leaders", "Data Scientists", "Hardware Engineers".
- goal_relevance: 1-3 from ONLY: "fundraising", "hiring", "sales", "upskilling", "networking"
- one_liner: One sentence (max 80 chars) describing why someone should visit. Be specific, not generic.
- networking_tip: One tactical tip for approaching this booth (max 100 chars).

If you don't know the company, infer from the name. Government ministries = governance/policy. Names with "Tech/AI/Labs" = likely AI products. Universities = research/education. "Foundation" = impact/social good.

Output ONLY a JSON array. Each item: { "id": N, "keywords": [...], "target_personas": [...], "goal_relevance": [...], "one_liner": "...", "networking_tip": "..." }`;

async function enrichExpo() {
  const exhibitors = JSON.parse(fs.readFileSync("./expolist.json", "utf8"));
  console.log(`\n━━━ EXPO ENRICHMENT ━━━`);
  console.log(
    `Exhibitors: ${exhibitors.length}, Batch size: ${EXPO_BATCH_SIZE}`
  );

  const batches = chunk(exhibitors, EXPO_BATCH_SIZE);
  const results = {};
  let done = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const compact = batch.map((e) => ({ id: e.id, name: e.name }));

    try {
      const enriched = await callClaude(
        EXPO_SYSTEM,
        `Enrich these ${batch.length} exhibitors:\n${JSON.stringify(compact)}`
      );

      for (const item of enriched) {
        if (item.id) results[item.id] = item;
      }

      done += batch.length;
      console.log(
        `  Batch ${i + 1}/${batches.length} done (${done}/${exhibitors.length})`
      );
    } catch (err) {
      console.error(`  Batch ${i + 1} FAILED: ${err.message}`);
      for (const e of batch) {
        results[e.id] = {
          id: e.id,
          keywords: ["AI"],
          target_personas: ["General Attendees"],
          goal_relevance: ["networking"],
          one_liner: `Visit ${e.name} at the expo`,
          networking_tip: "Introduce yourself and ask about their AI initiatives.",
        };
      }
      done += batch.length;
    }

    if (i < batches.length - 1) await sleep(DELAY_MS);
  }

  // Merge back into exhibitors
  let enrichedCount = 0;
  for (const exhibitor of exhibitors) {
    const enrichment = results[exhibitor.id];
    if (enrichment) {
      exhibitor.keywords = enrichment.keywords;
      exhibitor.target_personas = enrichment.target_personas;
      exhibitor.goal_relevance = enrichment.goal_relevance;
      exhibitor.one_liner = enrichment.one_liner;
      exhibitor.networking_tip = enrichment.networking_tip;
      enrichedCount++;
    } else {
      exhibitor.keywords = ["AI"];
      exhibitor.target_personas = ["General Attendees"];
      exhibitor.goal_relevance = ["networking"];
      exhibitor.one_liner = `Visit ${exhibitor.name} at the expo`;
      exhibitor.networking_tip =
        "Introduce yourself and ask about their AI initiatives.";
    }
  }

  fs.writeFileSync(
    "./expolist_enriched.json",
    JSON.stringify(exhibitors, null, 2)
  );
  console.log(
    `✓ Expo enriched: ${enrichedCount}/${exhibitors.length} via AI, rest defaulted`
  );
  console.log(`  Saved to expolist_enriched.json`);
  return exhibitors;
}

// ─── MAIN ─────────────────────────────────────────────────
async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   AI Summit Enrichment v2              ║");
  console.log("║   Sessions (463) + Expo (715)          ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`Model: ${MODEL}`);
  console.log(
    `Estimated API calls: ~${Math.ceil(463 / SESSION_BATCH_SIZE) + Math.ceil(715 / EXPO_BATCH_SIZE)}`
  );
  console.log(`Estimated cost: ~$1-3`);
  console.log(`Estimated time: 3-6 minutes\n`);

  const startTime = Date.now();

  await enrichSessions();
  await enrichExpo();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n━━━ DONE ━━━`);
  console.log(`Total time: ${elapsed}s`);
  console.log(`Output files:`);
  console.log(`  sessions_enriched_v2.json (463 events + 3 new fields)`);
  console.log(
    `  expolist_enriched.json (715 exhibitors + 5 new fields)`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
