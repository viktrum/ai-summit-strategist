# AI Summit Strategist — FINAL Implementation Plan v2

**Date**: February 12, 2026
**Status**: Pending approval, then build

---

## Decisions Made (This Session)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime AI | **NONE for quiz mode**. LinkedIn mode: one small AI call for tag extraction only | Instant results, $0 cost, zero failure modes |
| Matching | Exact set overlap on aligned vocabulary (no fuzzy, no AI) | Event keywords + user keywords use same vocabulary by design |
| Heavy hitters | Fully automated via scoring boost (no manual selection) | Less friction |
| Results UX | Primary + backup per slot + "Show all at this time" modal | User control without upfront decision fatigue |
| Icebreakers | One per event, pre-enriched (not persona-specific) | Simpler enrichment, still valuable |
| Frontend hosting | Vercel (Next.js) | SSR for shareable URLs, API routes, free tier |
| Database | Supabase (`user_plans` ONLY) | Events loaded as static JSON client-side |
| Events storage | Static JSON bundled with app (NO events table) | 463 events ~ 80-100KB gzipped, instant filtering |
| Expo exhibitors | 715 exhibitors also enriched, show top 3-5 per user | Same tag-based scoring, displayed after session recommendations |
| LinkedIn mode | Keep it, build after quiz. AI extracts tags only. | One small LLM call to convert bio → same tag structure as quiz |
| Flow 3 | In scope (static client-side filtering) | Easiest flow — no DB, no AI, just filter static JSON |
| Default event duration | 60 minutes (when end_time is null) | Used for time-slot overlap calculations |
| Keyword system | Aligned vocabulary — quiz/LinkedIn output the SAME keywords that exist in event data | Eliminates the 72% unreachable event problem by design |

---

## Core Concept: Tag-Based Matching

The entire recommendation engine is **tag comparison**. No AI at runtime (for quiz). No fuzzy matching. Just two sets of tags, scored by overlap.

```
EVENT TAGS (pre-enriched, already exist)     USER TAGS (from quiz or LinkedIn)
────────────────────────────────────         ────────────────────────────────
keywords: ["on-device AI",            ←→    keywords: ["edge computing",
  "agentic AI", "5G connectivity"]             "AI infrastructure", "telecom"]

target_personas: ["Telecom Engineers", ←→    personas: ["CTO",
  "Edge AI Developers",                        "Infra-focused Founder"]
  "5G Strategy Leads"]

technical_depth: 3                     ←→    technical_depth: 3

networking_signals: {                  ←→    networking_wants: {
  is_heavy_hitter: false,                      wants_heavy_hitters: true,
  decision_maker_density: "Medium",            wants_decision_makers: true,
  investor_presence: "Unlikely"                wants_investors: false
}                                            }

goal_relevance: ["networking",         ←→    goals: ["networking",
  "upskilling"]  (NEW — to enrich)             "fundraising"]
```

### Scoring Algorithm

```typescript
function scoreEvent(user: UserTags, event: EnrichedEvent): number {
  let score = 0;

  // Keyword overlap (exact match — same vocabulary by design)
  const keywordOverlap = user.keywords.filter(k => event.keywords.includes(k)).length;
  score += keywordOverlap * 10;                                    // max ~50

  // Persona match
  const personaOverlap = user.personas.filter(p => event.target_personas.includes(p)).length;
  score += personaOverlap * 8;                                     // max ~40

  // Technical depth proximity (closer = better)
  const depthDiff = Math.abs(user.technical_depth - event.technical_depth);
  score += depthDiff === 0 ? 15 : depthDiff === 1 ? 8 : 0;       // max 15

  // Goal alignment (NEW enrichment field)
  const goalOverlap = user.goals.filter(g => event.goal_relevance.includes(g)).length;
  score += goalOverlap * 8;                                        // max ~16

  // Networking signal alignment
  if (user.networking_wants.wants_heavy_hitters && event.networking_signals.is_heavy_hitter)
    score += 12;
  if (user.networking_wants.wants_decision_makers && event.networking_signals.decision_maker_density === 'High')
    score += 8;
  if (user.networking_wants.wants_investors && event.networking_signals.investor_presence === 'Likely')
    score += 8;

  return score;
}
```

Runs in <10ms for all 463 events. No API calls. No async. Pure math.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│ FRONTEND — Vercel (Next.js 14, App Router)               │
│                                                           │
│  Static Data: events.json (463 enriched events, bundled)  │
│                                                           │
│  Pages:                                                   │
│    /              → Landing (date select + quiz/LinkedIn)  │
│    /plan/[id]     → Results (SSR for share previews)      │
│    /explore       → Flow 3 (browse/filter all events)     │
│                                                           │
│  Client-Side Logic (NO API calls for quiz):               │
│    • Quiz → deterministic tag mapping → score events      │
│    • Pick top 10-12 by score                              │
│    • Resolve time-slot conflicts (primary + backup)       │
│    • Display pre-enriched icebreakers + networking tips   │
│    • Save plan to Supabase → shareable URL                │
│                                                           │
│  API Route (LinkedIn mode ONLY):                          │
│    POST /api/extract-tags                                 │
│      → Sends LinkedIn text to Claude Haiku                │
│      → Returns: UserTags (same structure as quiz output)  │
│      → Then same client-side scoring as quiz              │
│                                                           │
└──────────────────────┬───────────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │ SUPABASE                │
          │                         │
          │ Table: user_plans       │
          │ (save + load plans for  │
          │  shareable URLs)        │
          │                         │
          │ NO events table         │
          │ NO RPC functions        │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │ ANTHROPIC API           │
          │                         │
          │ Claude Haiku 4.5        │
          │ LinkedIn tag extraction │
          │ ONLY (~200 tokens out)  │
          │ NOT used for quiz mode  │
          └─────────────────────────┘
```

### What we eliminated vs ALL previous plans:
- ~~Supabase events table~~ → Static JSON
- ~~RPC functions~~ → Client-side scoring
- ~~Supabase Edge Functions~~ → One small Vercel API route (LinkedIn only)
- ~~Prompt A (profile extraction)~~ → Merged into single tag extraction call
- ~~Prompt B (concierge/plan generator)~~ → Eliminated entirely. Scoring is deterministic.
- ~~Manual heavy hitter selection screen~~ → Automated via score boost
- ~~Fuzzy matching (Fuse.js)~~ → Exact set overlap (aligned vocabulary)
- ~~Runtime AI for quiz mode~~ → Zero AI. Instant results.

---

## Where AI Is Used (Exactly)

| Context | AI? | What happens |
|---------|-----|-------------|
| **Enrichment** (one-time, pre-build) | Yes | Add `goal_relevance`, `icebreaker`, `networking_tip` to each event. ~$1-2 total. |
| **Quiz mode** (runtime) | **No** | Quiz → deterministic tags → score → display. Instant. $0. |
| **LinkedIn mode** (runtime) | **Yes, one small call** | LinkedIn text → Claude extracts UserTags → then same scoring as quiz. ~$0.001/user. |
| **Flow 3 Explore** (runtime) | **No** | Pure client-side filtering of static JSON. |

---

## Data Preparation (Pre-Build)

### ✅ COMPLETED — Enrichment Done

**Status**: All enrichment completed on Feb 12, 2026. Cost: ~$2 via Claude Haiku 4.5.

**Files produced**:
1. `sessions_enriched_v2.json` — 463 events with 3 new fields:
   - `goal_relevance`: ["fundraising", "networking", ...] (1-3 values)
   - `icebreaker`: Specific conversation starter (56% mention speaker names)
   - `networking_tip`: Tactical advice (60.5% contain positioning/timing guidance)
   - All 463 events enriched, 0 defaults
   - All null event_ids fixed (49 generated as `evt-{id}-{date}-{time}`)

2. `expolist_enriched.json` — 715 exhibitors with 5 new fields:
   - `keywords`: 3-5 topic tags (367 unique keywords total)
   - `target_personas`: 3-5 visitor types
   - `goal_relevance`: 1-3 values
   - `one_liner`: 60-80 char description
   - `networking_tip`: Engagement advice
   - All 715 enriched, 0 defaults

**Quality metrics**:
- 100% field completion on both datasets
- 0 generic/default content detected
- All goal_relevance values validated
- Icebreakers are specific and actionable
- Expo one-liners are descriptive (97% quality)

### Remaining Steps (Before Build)

### Step 1: Build keyword vocabulary alignment

Extract all unique keywords from both datasets to populate quizMapper.ts:

```javascript
// build_vocabulary.js
const sessions = require('./sessions_enriched_v2.json');
const exhibitors = require('./expolist_enriched.json');

const sessionKeywords = new Set();
const expoKeywords = new Set();
const allPersonas = new Set();

sessions.forEach(e => {
  e.keywords.forEach(k => sessionKeywords.add(k));
  e.target_personas.forEach(p => allPersonas.add(p));
});

exhibitors.forEach(e => {
  e.keywords.forEach(k => expoKeywords.add(k));
  e.target_personas.forEach(p => allPersonas.add(p));
});

const commonKeywords = [...sessionKeywords].filter(k => expoKeywords.has(k));

console.log(`Session keywords: ${sessionKeywords.size}`);
console.log(`Expo keywords: ${expoKeywords.size}`);
console.log(`Common keywords: ${commonKeywords.length}`);
console.log(`Total personas: ${allPersonas.size}`);

// Output for quizMapper.ts
fs.writeFileSync('vocabulary.json', JSON.stringify({
  sessionKeywords: [...sessionKeywords],
  expoKeywords: [...expoKeywords],
  commonKeywords,
  personas: [...allPersonas]
}, null, 2));
```

### Step 2: Run simulations

Test scoring across 6 sample profiles to validate:
- Do top 10-12 events make sense for each persona?
- Do top 3-5 exhibitors align with interests?
- How often do ties occur in the same time slot?
- Is the score distribution reasonable?

```javascript
// simulate.js
const sessions = require('./sessions_enriched_v2.json');
const exhibitors = require('./expolist_enriched.json');

const profiles = [
  { role: 'Founder / CXO', keywords: [...], techLevel: 2, ... },
  { role: 'Engineer / Researcher', keywords: [...], techLevel: 4, ... },
  // ... 4 more
];

profiles.forEach(profile => {
  // Score sessions
  const scoredSessions = sessions
    .filter(e => selectedDates.includes(e.date))
    .map(e => ({ ...e, score: scoreEvent(profile, e) }))
    .sort((a, b) => b.score - a.score);

  // Score exhibitors
  const scoredExhibitors = exhibitors
    .map(e => ({ ...e, score: scoreExhibitor(profile, e) }))
    .sort((a, b) => b.score - a.score);

  console.log(`\n━━━ ${profile.role} ━━━`);
  console.log(`Top 12 sessions:`, scoredSessions.slice(0, 12).map(e => `${e.title.slice(0, 40)} (${e.score})`));
  console.log(`Top 5 exhibitors:`, scoredExhibitors.slice(0, 5).map(e => `${e.name} (${e.score})`));

  // Check time-slot ties
  const slots = groupByTimeSlot(scoredSessions.slice(0, 20));
  const ties = slots.filter(s => s[0].score === s[1]?.score);
  console.log(`Time-slot ties: ${ties.length}`);
});
```

### Output files (for Next.js build)
- `public/data/events.json` — Copy of sessions_enriched_v2.json
- `public/data/exhibitors.json` — Copy of expolist_enriched.json

---

## Database Schema (Supabase — Minimal)

Only ONE table:

```sql
CREATE TABLE public.user_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile jsonb NOT NULL,
  recommended_schedule jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert plans"
  ON public.user_plans FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read plans"
  ON public.user_plans FOR SELECT USING (true);

CREATE INDEX idx_plans_created ON public.user_plans(created_at DESC);
```

No events table. No RPC functions. No Edge Functions.

---

## User Flows

### Flow 1: Quiz Mode (Primary — Build First)

```
Landing Page
  ↓ Select dates (Feb 16-20 toggles)
  ↓ Click "Build My Strategy"
  ↓
Quiz Modal
  ↓ Q1: Your Role (single-select, 6 options)
  ↓ Q2: Your Focus (multi-select, max 3, 6 options)
  ↓ Q3: Your Mission (multi-select, max 2, 5 options)
  ↓ Click "Generate My Strategy"
  ↓
Client-Side (instant, no API):
  ↓ quizToTags() → UserTags { keywords, personas, techLevel, goals, networking_wants }
  ↓ Filter events by selected dates
  ↓ Score all events using scoreEvent()
  ↓ Sort by score descending
  ↓ Resolve time-slot conflicts (primary + backup per 60-min window)
  ↓ Take top 10-12 events (max 4-5 per day)
  ↓ Attach pre-enriched icebreaker + networking_tip from event data
  ↓
Save plan to Supabase (one insert)
  ↓ Returns plan_id (UUID)
  ↓
Results Page (/plan/[id])
  ↓ Timeline grouped by date
  ↓ Each slot: primary event + backup + "show all at this time"
  ↓
Expo Recommendations (below timeline)
  ↓ Top 3-5 exhibitors scored by same tags
  ↓ Show: logo, name, one_liner, keywords, networking_tip
  ↓
  ↓ Share button (copy URL)
```

**Zero AI. Zero latency. Zero cost.**

### Flow 2: LinkedIn Mode (Build Second)

```
Same landing page
  ↓ Tab: "Paste Your LinkedIn Profile"
  ↓ Paste LinkedIn bio text (textarea)
  ↓ Select dates
  ↓ Click "Generate My Strategy"
  ↓
POST /api/extract-tags
  ↓ Sends LinkedIn text to Claude Haiku
  ↓ Claude extracts UserTags using event vocabulary
  ↓ Returns: same tag structure as quiz output
  ↓ (~200 tokens, <1 second, ~$0.001)
  ↓
Client-Side (same as quiz from here):
  ↓ Score all events using scoreEvent()
  ↓ Resolve conflicts, pick top 10-12
  ↓ Attach pre-enriched icebreakers
  ↓
Save plan to Supabase → Results Page
```

**One small AI call (tag extraction only), then same deterministic flow.**

### Flow 3: Explore Events (Build Last)

```
/explore page
  ↓ Load all 463 events (already in memory from static JSON)
  ↓
Filtering UI (all client-side, instant updates):
  ↓ Date selector (Feb 16-20)
  ↓ Technical depth slider (1-5)
  ↓ Heavy hitters only toggle
  ↓ Keyword/topic filter chips
  ↓ Search box (title/speakers/description)
  ↓ "Happening Now" / "Next 2 Hours" quick filters
  ↓
Results Grid
  ↓ Event cards with all metadata
  ↓ No saved output, no AI, no DB calls
  ↓ Ephemeral browsing only
```

**UX approach for Flow 3: TBD (to discuss next).**

---

## Quiz → Tag Mapping

Keywords and personas in the mapper will be drawn **directly from the event vocabulary** (built in Step 4 of data prep). This ensures exact matching works.

```typescript
// lib/quizMapper.ts
// NOTE: All keywords below are verified to exist in events.json

const roleMap: Record<string, {
  techLevel: number;
  personas: string[];           // Must match event.target_personas values
  keywords: string[];           // Must match event.keywords values
  networking_wants: { wants_heavy_hitters: boolean; wants_decision_makers: boolean; wants_investors: boolean };
}> = {
  'Founder / CXO': {
    techLevel: 2,
    personas: ['Series A Founders', 'C-Suite Executives', 'Tech Startup CEOs'],
    keywords: ['startup ecosystem', 'venture capital', 'AI strategy'],
    networking_wants: { wants_heavy_hitters: true, wants_decision_makers: true, wants_investors: true },
  },
  'Investor / VC': {
    techLevel: 2,
    personas: ['Impact Investors', 'Venture Capitalists', 'Angel Investors'],
    keywords: ['venture capital', 'startup ecosystem', 'AI investment'],
    networking_wants: { wants_heavy_hitters: true, wants_decision_makers: true, wants_investors: false },
  },
  'Engineer / Researcher': {
    techLevel: 4,
    personas: ['NLP Researchers', 'ML Engineers', 'AI Researchers'],
    keywords: ['large language models', 'responsible AI', 'AI safety'],
    networking_wants: { wants_heavy_hitters: false, wants_decision_makers: false, wants_investors: false },
  },
  'Product Leader': {
    techLevel: 3,
    personas: ['Product Managers', 'Enterprise AI Leaders', 'Digital Transformation Leads'],
    keywords: ['enterprise AI', 'digital transformation', 'AI adoption'],
    networking_wants: { wants_heavy_hitters: true, wants_decision_makers: true, wants_investors: false },
  },
  'Policy / Government': {
    techLevel: 1,
    personas: ['Policy Makers', 'Gov Officials', 'Regulators'],
    keywords: ['AI governance', 'data governance', 'responsible AI'],
    networking_wants: { wants_heavy_hitters: true, wants_decision_makers: true, wants_investors: false },
  },
  'Student / Academic': {
    techLevel: 3,
    personas: ['AI Researchers', 'PhD Students', 'Academics'],
    keywords: ['AI research', 'AI literacy', 'education reform'],
    networking_wants: { wants_heavy_hitters: false, wants_decision_makers: false, wants_investors: false },
  },
};

// Interest → keyword mapping (values from event vocabulary)
const interestKeywords: Record<string, string[]> = {
  'LLMs & GenAI':                      ['large language models', 'generative AI', 'foundation models', 'agentic AI'],
  'Compute, Cloud & Infra':            ['AI infrastructure', 'sovereign AI', 'edge computing', 'cloud computing'],
  'Ethics, Safety & Governance':       ['AI governance', 'responsible AI', 'AI safety', 'ethical AI', 'data governance'],
  'Startups & Venture Capital':        ['startup ecosystem', 'venture capital', 'AI investment'],
  'Enterprise Adoption':               ['enterprise AI', 'digital transformation', 'AI adoption'],
  'Social Impact (Agri, Health, Edu)': ['social impact', 'Global South', 'inclusive AI', 'digital public infrastructure'],
};

// Goal → goal_relevance mapping (values from enrichment)
const goalMap: Record<string, string[]> = {
  'Finding Talent / Hiring':     ['hiring'],
  'Fundraising / Meeting VCs':   ['fundraising'],
  'Finding Customers / Sales':   ['sales'],
  'Deep Learning / Upskilling':  ['upskilling'],
  'Networking / Serendipity':    ['networking'],
};

export interface UserTags {
  role: string;
  technical_depth: number;
  keywords: string[];
  personas: string[];
  goals: string[];
  networking_wants: {
    wants_heavy_hitters: boolean;
    wants_decision_makers: boolean;
    wants_investors: boolean;
  };
}

export function quizToTags(quiz: {
  role: string;
  interests: string[];
  goals: string[];
}): UserTags {
  const role = roleMap[quiz.role];

  const keywords = [
    ...role.keywords,
    ...quiz.interests.flatMap(i => interestKeywords[i] || []),
  ];

  const goals = quiz.goals.flatMap(g => goalMap[g] || []);

  return {
    role: quiz.role,
    technical_depth: role.techLevel,
    keywords: [...new Set(keywords)],
    personas: role.personas,
    goals: [...new Set(goals)],
    networking_wants: role.networking_wants,
  };
}
```

**Important**: The exact persona/keyword values in this mapper will be populated AFTER running `build_vocabulary.js` against the final enriched data. The values above are illustrative — they'll be replaced with actual values from the dataset.

---

## LinkedIn Tag Extraction (Only AI Call)

```typescript
// app/api/extract-tags/route.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// These are the actual values from our event data — extracted during build_vocabulary step
const VALID_KEYWORDS = [...]; // All unique event keywords (1,382 values)
const VALID_PERSONAS = [...]; // All unique event personas (~150 values)

export async function POST(req: Request) {
  const { linkedinText } = await req.json();

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: `Extract structured tags from a LinkedIn profile for matching against AI conference events.

Output ONLY valid JSON. Use ONLY values from the provided valid lists.

Valid keywords (pick 5-10 most relevant): ${JSON.stringify(VALID_KEYWORDS.slice(0, 200))}
Valid personas (pick 3-5 that describe this person): ${JSON.stringify(VALID_PERSONAS.slice(0, 100))}
Valid goals: ["fundraising", "hiring", "sales", "upskilling", "networking"]`,

    messages: [{ role: 'user', content: `LinkedIn Profile:
${linkedinText.slice(0, 2000)}

Extract tags as JSON:
{
  "role": "Founder / CXO | Investor / VC | Engineer / Researcher | Product Leader | Policy / Government | Student / Academic",
  "technical_depth": 1-5,
  "keywords": ["from valid keywords list"],
  "personas": ["from valid personas list"],
  "goals": ["from valid goals list"],
  "networking_wants": {
    "wants_heavy_hitters": true/false,
    "wants_decision_makers": true/false,
    "wants_investors": true/false
  }
}` }],
  });

  const tags = JSON.parse(
    message.content[0].type === 'text' ? message.content[0].text : '{}'
  );

  return Response.json(tags);
}
```

**Key design**: Claude is told to use ONLY keywords/personas that exist in our event data. Output is the same `UserTags` shape as quiz. From this point, same scoring logic applies.

---

## Time-Slot Conflict Resolution

```typescript
// lib/timeSlots.ts

const DEFAULT_DURATION_MIN = 60; // 60-minute default when end_time is null

interface TimeMinutes { start: number; end: number; }

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getEventTimeRange(event: EnrichedEvent): TimeMinutes {
  const start = parseTimeToMinutes(event.start_time);
  const end = event.end_time
    ? parseTimeToMinutes(event.end_time)
    : start + DEFAULT_DURATION_MIN;
  return { start, end };
}

function eventsOverlap(a: EnrichedEvent, b: EnrichedEvent): boolean {
  const aRange = getEventTimeRange(a);
  const bRange = getEventTimeRange(b);
  return a.date === b.date && aRange.start < bRange.end && bRange.start < aRange.end;
}

// Given scored events (sorted by score desc), resolve conflicts
export function resolveConflicts(
  scoredEvents: ScoredEvent[],
  maxPerDay: number = 5,
  totalMax: number = 12
): { primary: ScoredEvent; backup: ScoredEvent | null; allAtThisTime: ScoredEvent[] }[] {
  const selected: ScoredEvent[] = [];
  const result: { primary: ScoredEvent; backup: ScoredEvent | null; allAtThisTime: ScoredEvent[] }[] = [];
  const dayCount: Record<string, number> = {};

  for (const event of scoredEvents) {
    if (selected.length >= totalMax) break;

    const day = event.date;
    if ((dayCount[day] || 0) >= maxPerDay) continue;

    // Check for time conflicts with already-selected events
    const hasConflict = selected.some(s => eventsOverlap(s, event));
    if (hasConflict) continue;

    // Find backup: highest-scored overlapping event not selected
    const overlapping = scoredEvents.filter(e =>
      e.event_id !== event.event_id &&
      eventsOverlap(e, event) &&
      !selected.includes(e)
    );
    const backup = overlapping[0] || null; // Already sorted by score

    // Find ALL events at this time (from full dataset, not just scored)
    const allAtThisTime = overlapping;

    selected.push(event);
    dayCount[day] = (dayCount[day] || 0) + 1;
    result.push({ primary: event, backup, allAtThisTime });
  }

  return result;
}
```

---

## Results Page UI

For each recommended event slot:

```
┌──────────────────────────────────────────────────────┐
│ 🔥 Must Attend                    Score: 92          │
│                                                       │
│ Bill Gates — AI for Global Good                       │
│ 11:50 AM · Plenary Hall, Bharat Mandapam             │
│                                                       │
│ ✨ "Tech philanthropy meets AI: lessons from global   │
│    health transformed by machine learning"            │
│                                                       │
│ ▶ Networking Intel (expandable)                       │
│   💬 Icebreaker: "Ask about the Gates Foundation's   │
│      AI procurement process for health initiatives"   │
│   📍 Tip: "Arrive 15 min early. High decision-maker  │
│      density — scan name badges near the exit."       │
│                                                       │
│ ┌─ Also at this time ───────────────────────────────┐ │
│ │ 📋 AI Governance Panel (Score: 71)                │ │
│ │    11:30 AM · Room 12, Bharat Mandapam            │ │
│ │ [View all 4 events at this time →]                │ │
│ └───────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Tier assignment (deterministic):
- **Must Attend**: Top 3 events by score (or score > 80th percentile)
- **Should Attend**: Next 4-5 events
- **Nice to Have**: Next 2-3 events
- **Wildcard**: 1 event with lower score but high serendipity (heavy hitter in unrelated field)

---

## Enriched Event Schema (Final)

After second enrichment pass, each event in `events.json` will have:

```typescript
interface EnrichedEvent {
  // Original fields
  event_id: string;
  id: number;
  title: string;
  description: string | null;
  date: string;                    // "2026-02-16"
  start_time: string;              // "09:30" (normalized, no milliseconds)
  end_time: string | null;         // "10:30" or null (assume 60 min default)
  venue: string;
  room: string;
  speakers: string | null;         // Semicolon-separated
  knowledge_partners: string | null;
  session_type: string;

  // First enrichment (already done)
  summary_one_liner: string;
  technical_depth: number;         // 1-5
  target_personas: string[];       // 5 values
  networking_signals: {
    is_heavy_hitter: boolean;
    decision_maker_density: 'High' | 'Medium' | 'Low';
    investor_presence: 'Likely' | 'Unlikely';
  };
  keywords: string[];              // 5 values

  // Second enrichment (TO DO)
  goal_relevance: string[];        // ["fundraising", "networking"] — 1-3 values
  icebreaker: string;              // One specific conversation starter
  networking_tip: string;          // One tactical tip
}
```

---

## Environment Variables

### .env.local (development)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
ANTHROPIC_API_KEY=sk-ant-api03-...    # Only needed for LinkedIn mode
```

### Vercel Dashboard (production)
Same variables. `NEXT_PUBLIC_*` exposed to browser (safe for anon key).
Others are server-only.

**Note**: If you ship quiz-only MVP first, you don't even need the Anthropic API key.

---

## File Structure

```
ai-summit-strategist/
├── public/
│   └── data/
│       └── events.json              # 463 enriched events (static)
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── explore/
│   │   │   └── page.tsx             # Flow 3: Browse/filter events
│   │   ├── plan/
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Results page (SSR for share links)
│   │   └── api/
│   │       └── extract-tags/
│   │           └── route.ts         # LinkedIn → tags (Claude Haiku)
│   ├── components/
│   │   ├── QuizModal.tsx            # 3-question quiz
│   │   ├── LinkedInInput.tsx        # Paste profile textarea
│   │   ├── DateSelector.tsx         # Feb 16-20 toggle buttons
│   │   ├── EventCard.tsx            # Event display card (primary)
│   │   ├── BackupEvent.tsx          # Compact backup event row
│   │   ├── TimeSlotModal.tsx        # "All events at this time" modal
│   │   ├── FilterSidebar.tsx        # Flow 3 filters
│   │   └── EventGrid.tsx            # Flow 3 results grid
│   ├── lib/
│   │   ├── quizMapper.ts            # Quiz answers → UserTags
│   │   ├── scoring.ts               # scoreEvent() — tag overlap scoring
│   │   ├── timeSlots.ts             # Conflict resolution + overlap detection
│   │   ├── supabase.ts              # Supabase client init
│   │   └── types.ts                 # TypeScript interfaces
│   └── styles/
│       └── globals.css              # Tailwind + dark theme
├── scripts/
│   ├── fix_event_ids.js             # Fix 49 null event_ids
│   ├── normalize_times.js           # Strip .000 from times
│   ├── enrich_v2.js                 # Second enrichment (goal_relevance, icebreaker, tip)
│   ├── build_vocabulary.js          # Extract unique keywords + personas
│   └── simulate.js                  # Test scoring across 6 personas
├── .env.local                       # Secrets (gitignored)
├── .gitignore
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Build Order

### Phase 0: Data Prep + Setup (30 min)
- [ ] Run fix_event_ids.js (fix 49 nulls)
- [ ] Run normalize_times.js (strip .000)
- [ ] Run enrich_v2.js (add goal_relevance, icebreaker, networking_tip)
- [ ] Run build_vocabulary.js (extract keyword + persona vocabulary)
- [ ] Populate quizMapper.ts with actual vocabulary values
- [ ] Run simulate.js (validate scoring across 6 personas, check for ties)
- [ ] Create Next.js project with Tailwind + Shadcn
- [ ] Install deps: `@supabase/supabase-js`, `@anthropic-ai/sdk`, `lucide-react`
- [ ] Place final events.json in public/data/
- [ ] Create Supabase project + user_plans table
- [ ] Set up .env.local

### Phase 1: Landing + Quiz + Scoring (45 min)
- [ ] Landing page (hero, date selector, CTA)
- [ ] Quiz modal (3 questions)
- [ ] quizMapper.ts (quiz → UserTags)
- [ ] scoring.ts (scoreEvent function)
- [ ] timeSlots.ts (conflict resolution)
- [ ] Wire: quiz submit → score → resolve conflicts → save to Supabase → navigate to /plan/[id]

### Phase 2: Results Page (45 min)
- [ ] /plan/[id] page with SSR (fetch plan from Supabase)
- [ ] EventCard component (title, time, venue, badges, score, icebreaker, tip)
- [ ] BackupEvent component (compact runner-up)
- [ ] TimeSlotModal ("show all events at this time")
- [ ] Timeline grouped by date
- [ ] Tier badges (Must/Should/Nice/Wildcard)
- [ ] Share button (copy URL)

### Phase 3: LinkedIn Mode (30 min)
- [ ] LinkedInInput component (textarea + char limit)
- [ ] /api/extract-tags route (Claude Haiku → UserTags)
- [ ] Wire: LinkedIn submit → API call → score → same results flow
- [ ] Test with sample LinkedIn bios

### Phase 4: Flow 3 — Explore Events (45 min)
- [ ] /explore page
- [ ] Filtering UI (approach TBD — discuss next)
- [ ] Event cards with all metadata
- [ ] Instant client-side filtering
- [ ] Mobile responsive filters

### Phase 5: Polish + Deploy (30 min)
- [ ] Mobile responsive pass (375px, 768px, 1440px)
- [ ] Error states (empty results, plan not found, API failure for LinkedIn)
- [ ] OG meta tags for shareable plan URLs
- [ ] Deploy to Vercel + set production env vars
- [ ] Smoke test all 3 flows

**Total: ~3.5-4 hours**

---

## Cost Estimate

```
                    Quiz Mode    LinkedIn Mode
────────────────    ─────────    ─────────────
Enrichment (once)   $1-2         $1-2
Per user (runtime)  $0           ~$0.001
100 users           $0           $0.10
1,000 users         $0           $1.00
10,000 users        $0           $10.00

Vercel:             $0/mo (free tier)
Supabase:           $0/mo (free tier — only storing plans)
Domain:             $0 (use .vercel.app)
────────────────────────────────────────────
Total MVP:          ~$2 one-time + $0-10/mo depending on LinkedIn usage
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Scoring produces bad recommendations | Run simulations BEFORE building UI. Tune weights. |
| Time-slot ties (same score, same slot) | Simulation will tell us if this is a real problem. If so, add tiebreaker (prefer higher decision_maker_density). |
| LinkedIn tag extraction fails | Wrap in try/catch. Fallback: show quiz pre-filled with best-guess role. |
| Too few events match (narrow profile) | If <10 results, progressively widen: tech_depth ±2, then drop keyword filter, then show top by networking_signals alone. |
| Icebreakers feel generic | Quality depends on enrichment prompt. Review sample of 20 during data prep. Re-run enrichment if quality is low. |
| 89% events missing end_time | 60-minute default duration for all overlap calculations. |

---

## What's Different From Previous Plans

| Previous (FINAL_PLAN v1) | This Plan (v2) |
|--------------------------|----------------|
| Fuse.js fuzzy matching | Exact set overlap (aligned vocabulary) |
| Runtime AI for all users (Prompt B) | Zero runtime AI for quiz. Tiny tag extraction for LinkedIn only. |
| ~$0.005 per user | $0 per quiz user, ~$0.001 per LinkedIn user |
| 3-5 sec latency (LLM response) | Instant results for quiz (no API call) |
| LLM generates icebreakers at runtime | Pre-enriched icebreakers (one per event, in static JSON) |
| 6 persona-specific icebreaker variants | 1 universal icebreaker per event (simpler, still valuable) |
| Needed Anthropic API key for all modes | Only need API key for LinkedIn mode |
| JSON parse errors from LLM possible | No LLM output to parse (quiz mode) |
| Fuse.js dependency | No matching library needed — pure JS array operations |

---

## Open Items

1. **Flow 3 UX approach**: TBD (discuss next). Heat map, Netflix rows, sidebar, or tag cloud.
2. **Exact quiz mapper values**: Will be populated after running build_vocabulary.js against enriched data.
3. **Enrichment quality**: Review icebreakers + tips after second enrichment pass. May need prompt tuning.
4. **Simulation results**: May reveal need for scoring weight adjustments or tiebreakers.
