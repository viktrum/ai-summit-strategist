# AI Summit Strategist - Project Context

## Project Overview

**AI Summit Strategist** (aka "The Elite Concierge") is a web app that generates personalized, high-ROI networking itineraries for attendees of the India AI Impact Summit (February 16-20, 2026). The app optimizes for **networking value over learning value** - helping users identify the right 15-minute conversations that can change their career trajectory.

### Core Philosophy
- "Knowledge is cheap as long as you know what to learn" - prioritize relationship ROI
- **No hard per-day cap** — show all non-overlapping events; buffer time is natural from gaps between sessions
- Surface "hidden value" - e.g., "Gov officials speaking = valuable for EdTech founders seeking procurement deals"
- Emphasize "heavy hitters" (FAANG, OpenAI, government ministers) - rooms with high networking density

### Build Context
- **Timeline**: 4-hour build sprint
- **Current Status**: Data enrichment complete (463 events with AI-generated "Rich DNA" metadata)
- **Next Steps**: Build Lovable UI + Supabase backend + Edge Functions

---

## Technical Architecture

### Hybrid Pre-Computation Strategy

**Critical Decision**: We do NOT send 463 events to an LLM on every user request. Instead:

1. **Offline Enrichment** (DONE):
   - Ran `enrich.js` script using Claude 3.5 Haiku locally in Cursor
   - Generated `sessions_enriched.json` with "Rich DNA" metadata for all 463 events
   - Cost: ~$0.25 total (one-time)

2. **Runtime Flow** (BUILT):
   - User submits quiz → Deterministic scoring (persona + keyword + depth + networking signals + sector + seniority - deal breakers) → Top 30 candidates per day → Greedy non-overlapping scheduling → All non-overlapping primaries + overlapping alternatives per slot

**Why This Wins**:
- 95% token reduction (30 events vs 463)
- Speed: Sub-3-second response times
- Consistency: Same event metadata for all users
- Debuggable: Can inspect/fix tags in database

---

## Data Structure

### Database Schema (Supabase)

#### `events` Table (463 rows, read-only)
Core fields:
- `event_id` (text, PRIMARY KEY)
- `id` (int)
- `title`, `description`, `date`, `start_time`, `end_time`, `venue`, `room`
- `speakers` (text, semicolon-separated)
- `knowledge_partners` (text)
- `session_type` (text)

**Rich DNA Fields** (AI-generated during enrichment):
- `summary_one_liner` (text) - Punchy 10-word value proposition
- `technical_depth` (int, 1-5) - 1=Policy/General, 5=Deep Research
- `target_personas` (text[]) - e.g., ["Series A Founders", "NLP Researchers"]
- `networking_signals` (jsonb) - `{is_heavy_hitter: boolean, decision_maker_density: "High"|"Medium"|"Low", investor_presence: "Likely"|"Unlikely"}`
- `keywords` (text[]) - 5 tags for matching

#### `user_plans` Table (stores generated schedules)
- `id` (uuid, PRIMARY KEY) - Used in shareable URLs
- `user_profile` (jsonb) - Quiz answers or extracted profile
- `recommended_schedule` (jsonb) - Final AI-generated itinerary
- `created_at` (timestamp)

### Data Quality (from agent analysis)
- ✅ 100% field completion on enriched data
- ✅ Clean dataset: 463 events (removed 17 duplicates)
- ✅ Heavy hitters: 31/463 events (6.7%)
- ✅ Distribution: 40% depth-2 (leadership), 33% depth-3 (implementation), 14% depth-4 (research)
- ✅ One-liners avg 69 chars - perfect for UI cards
- ⚠️ 57 events missing session_type classification

---

## User Experience Flow

**Full spec**: See `docs/UX_FLOW.md` for page-by-page elements, actions, and navigation.

### Page Map

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/` | Entry point, date selection, CTA |
| Quiz | `/quiz?dates=...` | Role, interests, missions (or paste LinkedIn) |
| Loading | `/loading` | Terminal animation while strategy generates |
| Plan | `/plan/local` | Personalized event schedule + exhibitors |
| Explore | `/explore` | Browse all 463 events (no strategy required) |

### Navigation Summary

| Action | From | To |
|--------|------|-----|
| Build My Strategy | Landing (dates selected) | `/quiz?dates=...` |
| View All Events | Landing | `/explore` |
| Generate My Strategy | Quiz (step 3) or Profile tab | `/loading` |
| (auto) | Loading | `/plan/local` |
| Start Over / Build a new strategy | Plan | `/` |
| Share Plan | Plan | Copy URL to clipboard |
| Home | Explore | `/` |

### Landing Page (`/`)
- **Hero**: "Don't Waste Your Time at the India AI Summit. Get Your High-ROI Strategy in 30 Seconds."
- **Date Selector**: Multi-select toggle buttons for Feb 16–20
- **CTA**: "Build My Strategy" → `/quiz?dates=...`
- **View All Events** → `/explore`

### Quiz Page (`/quiz?dates=...`)
- **Tab A: Quick Quiz** — 3 steps: Role (single), Interests (max 3), Missions (max 2)
- **Tab B: LinkedIn Profile** — Textarea, min 20 chars
- **Generate My Strategy** → saves to localStorage, navigates to `/loading`

### Loading Page (`/loading`)
- Terminal-style animation with 10 lines
- Reads quiz + dates from localStorage, runs scoring, writes plan
- Auto-redirects to `/plan/local`

### Plan Page (`/plan/local`)
- **Output**: Personalized schedule of 10–12 events + exhibitors
- **Per event**: Tier badge, score, time/venue, one-liner, speakers, expandable Networking Intel (icebreaker, strategy, score breakdown), conflict fallback
- **Actions**: Start Over → `/`, Share Plan → copy URL

### Explore Page (`/explore`)
- Search bar, filter panel (date, topics, venue, depth, heavy hitters)
- Collapsible event cards with full metadata
- Home → `/`

---

## AI Implementation

### Two-Prompt Architecture

#### Prompt A: Profile Extractor (Only for "Paste Profile" mode)
**Input**: Raw LinkedIn bio/resume text
**Output**: Structured JSON
```json
{
  "profile": {
    "name": "String or 'Attendee'",
    "current_role": "String",
    "current_company": "String",
    "seniority_level": "CXO|VP|Manager|IC|Student",
    "core_domains": ["Array of strings"],
    "target_goals": ["Array of strings"],
    "is_technical": "Boolean"
  }
}
```

#### Prompt B: Elite Concierge (Always runs)
**System Instruction**:
```
You are an elite networking strategist and conference concierge for the India AI Impact Summit.
You optimize for relationship ROI - the probability of meeting people who can meaningfully
impact the user's career, business, or strategic goals.

You will receive:
1. A structured user profile (from quiz or extraction)
2. 30 pre-filtered candidate events (already matched on technical_depth and keywords)

Your job: Select the best 10-12 events across their available days, resolve time conflicts,
write personalized icebreakers, and explain networking strategy.

Scoring weights:
- Speaker-company match: 20%
- Speaker-domain match: 20%
- Halo Effect (Big Tech/Gov): 20%
- Speaker seniority: 15%
- Topic relevance: 15%
- Knowledge partner alignment: 10%

CRITICAL RULES:
- No hard per-day cap — show all non-overlapping events (greedy scheduling)
- For overlapping time slots, pick ONE primary + alternatives (top alternative = fallback P2)
- Heavy hitter events (Google, Meta, OpenAI, Gov ministers) get boosted UNLESS user works there
- Be specific: "Approach Mohit Jain after his talk" not "Attend this AI session"
- Flag low-confidence picks with confidence: "low" and explain assumptions
```

**Output Schema**:
```json
{
  "plan_summary": {
    "headline": "The Founder Track",
    "strategy_note": "2-3 sentence overall approach"
  },
  "schedule": [
    {
      "event_id": "string",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "tier": "Must Attend|Should Attend|Nice to Have|Wildcard",
      "networking_roi_score": 85,
      "match_reasoning": {
        "why": "2-3 sentences explaining relevance",
        "halo_effect": true
      },
      "networking_tactics": {
        "target_speaker": "Specific name",
        "icebreaker": "Tailored question based on user background",
        "strategy": "Tactical advice (sit front, arrive early, etc)"
      },
      "conflict_fallback": {
        "has_conflict": false,
        "fallback_event_id": null
      }
    }
  ]
}
```

### Recommendation Flow (Three Stages)

**Stage 1: Heavy Hitter Selection**
- Query: Get all heavy hitters for selected dates
- User picks 4-5 must-attend VIP sessions
```sql
SELECT * FROM events
WHERE date = ANY(user_dates)
  AND (networking_signals->>'is_heavy_hitter')::boolean = true
ORDER BY date, start_time;
```

**Stage 2: Domain-Matched Pre-Filter (Supabase RPC)**

**Function**: `get_candidate_events(user_tech_level int, user_keywords text[], selected_hh_ids text[])`

**Logic**:
```sql
SELECT * FROM events
WHERE
  date = ANY(user_dates)
  AND event_id != ALL(selected_hh_ids)  -- Exclude already-selected heavy hitters
  AND (technical_depth BETWEEN user_tech_level-1 AND user_tech_level+1)
  AND keywords && user_keywords  -- Array overlap operator
ORDER BY date, start_time
LIMIT 25;
```

**Stage 3: AI Personalization**
- Merge user-selected heavy hitters + top 25 candidates
- AI picks best 5-7 from candidates, writes icebreakers
- Final output: 10-12 events total (4-5 HH + 5-7 matched)

**Quiz → SQL Mapping**:
- Role "Founder/CXO" → `user_tech_level = 2`, keywords += ["startups", "venture capital", "strategy"]
- Role "Engineer/Researcher" → `user_tech_level = 4`, `is_technical = true`, keywords += ["technical", "research"]
- Interest "LLMs & GenAI" → keywords += ["generative AI", "LLMs", "foundation models"]
- Goal "Fundraising" → keywords += ["venture capital", "investors"], `require_heavy_hitter = true`

---

## Important Implementation Notes

### The "Heavy Hitter First" Strategy

**Critical Change**: Recommendation is now two-stage:

**Stage 1: Heavy Hitter Selection (4-5 events)**
- Present all 31 heavy hitters to user
- Let them pick 4-5 must-attend VIP sessions
- Heavy hitters include:
  - VIP Keynotes: Bill Gates, Sundar Pichai, Sam Altman, Demis Hassabis, Yann LeCun, Rishi Sunak, etc.
  - AI Pioneers: Stuart Russell, Jaan Talinn, Yoshua Bengio
  - Tech Leaders: Brad Smith, Vinod Khosla, Ashwini Vaishnaw (IT Minister)
  - Tier-1 Orgs: OpenAI, Anthropic sessions

**Stage 2: Domain-Matched Sessions (remainder)**
- After heavy hitters selected, fill remaining 5-10 slots with domain/interest-matched events
- Uses technical_depth + keyword matching
- Applies standard scoring rubric

**Implementation Notes**:
- Heavy hitter flag set during enrichment: `networking_signals.is_heavy_hitter = true`
- 31 total heavy hitters across 5 days (~6 per day avg, 6.7% of all events)
- 5 time slot overlaps (acceptable - gives user choice)
- Heavy distribution: Feb 19 (11 events) and Feb 20 (13 events) are the VIP-heavy days
- **Exception**: If `user.current_company` matches event organizer, don't show in heavy hitter list

### Conflict Resolution & Time Overlap Logic
- **Problem**: LLMs will confidently create overlapping schedules (10:30 AM + 10:45 AM both marked "Primary")
- **Solution**: Frontend handles conflict resolution using actual time overlap detection
- **Overlap detection**: Two events overlap if `startA < endB AND startB < endA` (strict inequality — back-to-back events like 11:00-11:30 and 11:30-12:00 are NOT overlapping and both appear as separate slots)
- **Greedy scheduling**: Sort candidates by score descending. Pick highest-scoring event as primary. Skip if it overlaps with any existing primary. Continue until all candidates processed. Result: all non-overlapping primaries shown.
- **Alternatives**: Overlapping events become alternatives on the earliest overlapping primary. The top alternative becomes the fallback (P2 card). View alternatives button appears on every slot that has alternatives.
- **No per-day cap**: All non-overlapping events are shown. The schedule fills naturally based on what fits without overlap.
- **Candidate pool**: Top 30 scored events per day (not global). This ensures each day has enough candidates for both primaries and alternatives.
- **Example**: E1: 11:00-11:30, E2: 11:30-12:00, E3: 11:15-11:45. E1 and E2 are separate primaries (non-overlapping). E3 overlaps both but is assigned as alternative to E1 (earliest overlapping primary).

### Venue Preferences
- **Prefer**: Bharat Mandapam (84% of events), Bharat Mandapam Expo Area
- **Penalize**: Sushma Swaraj Bhavan (only include if top 10% score)

### Cost Control
- **Enrichment**: $0.25 total (one-time, already done)
- **Runtime**: ~30 events + profile per request (cheap)
- **Caching**: Store result in `user_plans`, subsequent visits = instant (no re-run)

### Security
- Row Level Security (RLS) enabled on both tables
- Public read on `events` (read-only dataset)
- Public insert/read on `user_plans` (for hackathon speed)
- No authentication required (anonymous UUIDs)

---

## Design Guidelines

### Visual Style
- **Theme**: "Deep tech vibes" - Dark mode or high-contrast
- **Colors**: Deep blues, blacks, whites, subtle gradients
- **Aesthetic**: Professional, "Tech Summit" feel
- **Mobile-first**: Responsive cards, legible on small screens

### Icons (Lucide React)
- Calendar, MapPin (venue)
- Users, Zap (networking signals)
- Star, Flame (heavy hitters)
- Clock (time conflicts)

### Component Library
- **Shadcn UI** for base components
- **Tailwind CSS** for styling
- Keep cards clean and scannable

---

## Data Import Checklist

Before importing `sessions_enriched.json` to Supabase:

1. ✅ Enrichment script completed (463 events after removing 17 duplicates)
2. ✅ Deduplicated data: Final clean dataset has 463 events
3. ⚠️ **TODO**: Classify 57 events with missing `session_type`
4. ✅ Create Supabase tables via SQL Editor
5. ✅ Import JSON via Table Editor (column mapping should be automatic)
6. ✅ Test RPC function with sample queries

---

## Key Metrics (From Agent Analysis)

### Summit Focus (Top Personas)
1. Gov Officials (21% of sessions)
2, Policy Makers (12%)
3. Impact Investors (6%)
4. EdTech Founders (5%)
5. AI Researchers (5%)

**Insight**: This is a governance/policy summit, not pure tech conference

### Top Themes (By Keyword Frequency)
1. AI Governance (40+ mentions)
2. Responsible/Ethical AI (30+ mentions)
3. Global South (29+ mentions)
4. AI Safety (24+ mentions)
5. Digital Public Infrastructure (19+ mentions)

### Heavy Hitters
- **Total**: 31/463 events (6.7%)
- **Pattern**: Span all technical depths (not just deep-tech)
- **Examples**: Stuart Russell + Jaan Talinn on hardware safety (depth 5), UN Women equity session (depth 2)

---

## Success Criteria

### Must Have
- ✅ Quiz generates schedule in <5 seconds
- ✅ Shareable URLs work correctly
- ✅ Mobile-responsive event cards
- ✅ Deterministic filtering working (30 candidates)
- ✅ AI icebreakers are specific, not generic

### Nice to Have
- Calendar export (ICS file)
- Filter/search on results page
- "Compare Plans" for multiple personas
- Analytics (which events most popular)

---

## File Structure Reference

```
/project-root
├── fetch_sessions.py          # Original scraper (fetched 480 events)
├── sessions.json              # Raw event data
├── sessions.csv               # CSV export
├── sessions_enriched.json     # AI-enriched data (PRODUCTION READY - 463 events)
├── Prompt.txt                 # Original RISEN prompt
├── Gemini Conversation.txt    # Technical decisions log
├── CLAUDE.md                  # This file
└── plan.md                    # Implementation roadmap
```

---

## Common Pitfalls to Avoid

1. **Don't send 463 events to LLM** - Use pre-filtered 30 candidates per day
2. **Don't group by exact start_time** - Use actual time overlap detection (`startA < endB && startB < endA`)
3. **Don't cap events per day** - Show all non-overlapping events; greedy scheduling naturally fills the day
4. **Don't forget the Halo exception** - Strip boost if user works at heavy hitter company
5. **Don't make generic icebreakers** - AI must use specific user background + speaker details
6. **Back-to-back is OK** - Events ending at 11:30 and starting at 11:30 are NOT overlapping (strict inequality)

---

## Questions? Debug Tips

### If recommendations seem irrelevant:
- Check quiz → keyword mapping in Edge Function
- Verify technical_depth range is ±1 (not exact match)
- Ensure `require_heavy_hitter` logic is working

### If events are missing:
- Check date filter (only show user's selected days)
- Verify Supabase import completed (should be 463 rows)
- Check for duplicate event_ids (17 duplicates removed during cleanup)

### If AI output is malformed:
- Enforce JSON schema in prompt ("Output ONLY valid JSON")
- Add error handling in Edge Function
- Test with Claude 3.5 Haiku (better JSON compliance than 3.0)

---

## Next Steps

See `plan.md` for detailed implementation roadmap.
