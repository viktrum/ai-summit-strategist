const fs = require('fs');
const path = require('path');

// ─── LOAD API KEY ────────────────────────────────────────
const envPath = path.join(__dirname, '..', '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
}
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('No ANTHROPIC_API_KEY'); process.exit(1); }

const Anthropic = require('@anthropic-ai/sdk').default;
const anthropic = new Anthropic({ apiKey: API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 8;
const DELAY_MS = 600;

// ─── LOAD DATA ───────────────────────────────────────────
const events = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'events_needing_enrichment.json'), 'utf8')
);
console.log(`Events to enrich: ${events.length}`);

// ─── TAXONOMY REFERENCE ──────────────────────────────────
const KEYWORD_CATEGORIES = {
  "AI Technology & Architecture": ["Generative AI", "Software Development", "Foundation Models", "Data Science", "Frontier AI", "Deep Learning", "Machine Learning", "Engineering"],
  "AI Governance & Ethics": ["Responsible AI", "AI Governance", "Cybersecurity", "AI Safety", "AI Security", "Threat Detection", "Ethical AI", "Trusted AI", "Deepfakes", "Risk Management", "Transparency", "Accountability"],
  "Data & Infrastructure": ["AI Infrastructure", "Data Governance", "Digital Public Infrastructure", "Cloud Computing", "Edge Computing", "Semiconductor", "Hardware", "IoT", "Data Analytics", "Networking", "Open Data", "Infrastructure", "Blockchain", "5G", "Data Centers", "AI Compute", "On-Device AI"],
  "Industry Applications": ["Healthcare AI", "FinTech", "Telecom", "AgriTech", "Industrial AI", "Digital Health", "Supply Chain", "Medical Technology", "Energy Efficiency", "Smart Cities", "Public Health", "Renewable Energy", "Financial Services", "Smart Grid", "Health Systems", "Drug Discovery", "Genomics", "Precision Medicine", "AI Diagnostics", "Energy AI", "Space Tech"],
  "Skills & Workforce Development": ["AI Skilling", "EdTech", "Higher Education", "Workforce Development", "Education", "Future of Work", "AI Literacy", "Human Capital", "AI Education", "Talent Pipeline", "Capacity Building"],
  "Business & Entrepreneurship": ["Enterprise AI", "Startup Ecosystem", "Business Solutions", "AI Products", "Consulting", "Venture Capital", "AI Adoption", "Economic Growth", "Impact Investing", "Public-Private Partnership", "India AI Ecosystem", "AI Entrepreneurship", "Scaling AI", "AI Strategy"],
  "Geopolitics & Global Strategy": ["Sovereign AI", "Global South", "Defense AI", "Geopolitics", "Global Governance", "National Security", "South-South Cooperation", "Cross-Border Collaboration"],
  "Social Impact & Inclusion": ["Inclusive AI", "Sustainability", "Climate AI", "Social Impact", "Digital Inclusion", "Financial Inclusion", "Food Security", "Child Safety", "AI Democratization", "Equitable AI", "Gender Equity", "Climate Tech", "Health Equity", "Public Interest AI", "Human Rights"],
  "Digital Transformation & Services": ["Digital Transformation", "Automation", "Business Intelligence", "IT Services", "Public Services", "HR Tech", "No-Code AI", "Digital Marketing"],
  "Specialized AI Domains": ["Robotics", "Agentic AI", "Multilingual AI", "Autonomous Systems", "Creative AI", "Computer Vision", "Conversational AI", "Digital Twins", "Geospatial AI", "Quantum Computing"],
  "Research & Innovation": ["AI Research", "Deep Tech", "Open Source AI", "AI Evaluation", "Frugal AI", "Developer Tools", "Innovation"],
  "Regulatory & Legal Frameworks": ["Governance", "AI Policy", "Interoperability", "AI Standards", "Legal Tech", "Data Protection"],
};

const PERSONAS = [
  "Early-Stage Founders", "Growth-Stage Founders", "Technical Founders",
  "C-Suite Executives", "Technology Leaders", "Innovation & Strategy Leaders",
  "AI Product Managers", "Product Managers", "ML Engineers", "Data Scientists",
  "Backend Engineers", "Frontend & Full-Stack Engineers", "AI Researchers",
  "Academic Faculty", "Government & Policy Leaders", "Investors & VCs",
  "Consultants & Advisors", "Healthcare Professionals", "Educators",
  "Students", "Media & Analysts", "NGO & Social Sector"
];

// ─── HELPERS ─────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ─── ENRICHMENT PROMPT ──────────────────────────────────
const SYSTEM_PROMPT = `You are an AI conference event enrichment engine. For each event, analyze its title, description, and speakers to generate metadata.

OUTPUT FORMAT: A JSON array. Each item MUST have these fields:
{
  "event_id": "string (copy from input)",
  "summary_one_liner": "Punchy 8-12 word value proposition (max 80 chars)",
  "technical_depth": 1-5 (1=Policy/General, 2=Leadership/Strategy, 3=Implementation, 4=Technical/Research, 5=Deep Research/Engineering),
  "target_personas": ["Pick 2-4 from the allowed list"],
  "networking_signals": {
    "is_heavy_hitter": true/false (true ONLY if speakers include ministers, FAANG execs, heads of UN/WHO/World Bank, or CEOs of major AI companies like OpenAI, Anthropic, Google DeepMind),
    "decision_maker_density": "High"|"Medium"|"Low",
    "investor_presence": "Likely"|"Unlikely"
  },
  "keywords": [{"category": "CategoryName", "keyword": "KeywordName"}, ...] (pick 3-5 from allowed taxonomy),
  "goal_relevance": ["Pick 1-3 from: fundraising, hiring, sales, upskilling, networking"],
  "icebreaker": "One specific conversation starter using a speaker name if available (max 120 chars)",
  "networking_tip": "One tactical networking tip for this event (max 100 chars)"
}

ALLOWED PERSONAS: ${PERSONAS.join(', ')}

ALLOWED KEYWORDS (category: keywords):
${Object.entries(KEYWORD_CATEGORIES).map(([cat, kws]) => `${cat}: ${kws.join(', ')}`).join('\n')}

RULES:
- summary_one_liner: Be specific to THIS event, not generic. Max 80 chars.
- technical_depth: Government/policy panels=1-2, Business strategy=2-3, Technical demos=3-4, Research papers=4-5
- is_heavy_hitter: Be conservative. Only true for genuinely famous speakers (Bill Gates, Sam Altman, government ministers, UN leaders, FAANG VPs+)
- Keywords MUST come from the allowed list above. Pick the best 3-5 matches.
- target_personas MUST come from the allowed list above.
- Icebreaker must reference a speaker by name if speakers exist.

Output ONLY the JSON array. No markdown, no explanation.`;

// ─── MAIN ────────────────────────────────────────────────
async function main() {
  const batches = chunk(events, BATCH_SIZE);
  const results = {};
  let done = 0;
  let failed = 0;

  console.log(`Batches: ${batches.length}, Model: ${MODEL}`);
  console.log(`Estimated cost: ~$${(events.length * 0.002).toFixed(2)}\n`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const compact = batch.map(e => ({
      event_id: e.event_id,
      title: e.title,
      description: (e.description || '').slice(0, 300),
      speakers: (e.speakers || '').slice(0, 200),
      knowledge_partners: e.knowledge_partners || '',
      room: e.room || '',
      date: e.date,
    }));

    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const msg = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `Enrich these ${batch.length} events:\n${JSON.stringify(compact)}` }],
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('No JSON array in response');
        const enriched = JSON.parse(jsonMatch[0]);

        for (const item of enriched) {
          if (item.event_id) results[item.event_id] = item;
        }

        done += batch.length;
        console.log(`  Batch ${i + 1}/${batches.length} done (${done}/${events.length})`);
        break;
      } catch (err) {
        if (attempt < 2) {
          console.log(`  Batch ${i + 1} retry ${attempt + 1}: ${err.message}`);
          await sleep(2000);
        } else {
          console.error(`  Batch ${i + 1} FAILED: ${err.message}`);
          failed += batch.length;
          // Defaults for failed events
          for (const e of batch) {
            results[e.event_id] = {
              event_id: e.event_id,
              summary_one_liner: e.title.slice(0, 70),
              technical_depth: 2,
              target_personas: ['Government & Policy Leaders'],
              networking_signals: { is_heavy_hitter: false, decision_maker_density: 'Medium', investor_presence: 'Unlikely' },
              keywords: [{ category: 'AI Governance & Ethics', keyword: 'AI Governance' }],
              goal_relevance: ['networking'],
              icebreaker: `Ask about ${e.title.slice(0, 50)}`,
              networking_tip: 'Arrive early for best seating and networking.',
            };
          }
          done += batch.length;
        }
      }
    }

    if (i < batches.length - 1) await sleep(DELAY_MS);
  }

  // ─── APPLY ENRICHMENT TO MERGED FILE ────────────────────
  const mergedPath = path.join(__dirname, '..', 'enriched', 'events_official_merged.json');
  const merged = JSON.parse(fs.readFileSync(mergedPath, 'utf8'));

  let enriched = 0;
  for (const event of merged) {
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
      enriched++;
    }
  }

  // Save updated merged file
  fs.writeFileSync(mergedPath, JSON.stringify(merged, null, 2));
  console.log(`\nEnriched ${enriched}/${events.length} events (${failed} failed, used defaults)`);
  console.log(`Updated: ${mergedPath}`);

  // Verify no nulls remain
  const stillNull = merged.filter(e => e.summary_one_liner === null);
  console.log(`Events still missing enrichment: ${stillNull.length}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
