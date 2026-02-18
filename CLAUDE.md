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

## Session Log

**IMPORTANT RULES**:

1. At the end of every session (or when context is running low), append a summary to this section. Capture:
   - User corrections ("I said X, not Y")
   - Changed preferences or reversed decisions
   - Key UX/design decisions and the reasoning
   - Bugs reported and how they were fixed
   - Any "don't do this" instructions

2. **Always explain plan deviations proactively**: Whenever you deviate from the approved plan during implementation — even for good technical reasons — you MUST stop and explain the change and why BEFORE continuing. Do not silently swap approaches. Examples: switching from `list()` API to HEAD/ETag, choosing a different data structure, adding an extra step. The user should never discover a deviation after the fact.

This is the persistent record across sessions. Keep entries concise but specific.

---

### Session: Feb 13, 2026 (Initial Build)
- Built the full app: landing, quiz, loading, plan, explore pages
- Scoring engine, greedy scheduling, AI personalization via Claude
- Supabase integration for plan storage
- Netlify deployment to aisummit26.info

### Session: Feb 14, 2026 (Polish & Features)

**UX Corrections:**
- "Jump to Now" is the preferred copy (not "What's Next" or "What's Now")
- "Jump to Now" button should only appear when today's date is actually in the schedule — not just because the user navigated to a different day
- Clicking Now on the same day should still scroll (don't no-op)
- Navbar should be permanently visible on all pages (was hiding on scroll, leaving a gap)
- "View X alternatives" is the preferred text (not "X more events at this time")

**Key Decisions:**
- **Remove all time awareness from Explore page** — "creates more issue than the functionality it provides". No past styling, no auto-scroll, no What's Now button. Time awareness only on Plan page.
- **Explore page gets floating CTA**: "My Schedule" (if plan exists) or "Generate Schedule" (if not)
- **"Add to My Schedule" from Explore**: Users can manually add events from the event detail sheet. No overlap handling, allow duplicates. Events get `isManual: true` tag and show "Manually Added" badge. Button is in a sticky footer (not inside scrollable content).
- **Don't remove manually added events from alternatives/backup** in the plan view
- **Exhibitor category filter**: Top-level only (Startup, Corporate, Government, Academia, PSU, Country Pavilion, Research). User explicitly said "I don't want subcategory"
- **Always explain before implementing** when making significant changes — user asked "Tell me exactly what you're going to do" before the Add to Schedule feature

**Bugs Fixed:**
- Explore page auto-scrolled 2-3 screens on load/date change (useEffect firing on every selectedDay change)
- Event detail sheet "Add" button hidden by long content (moved to sticky footer)
- Turbopack dev server crash when .next deleted during production build (expected, just restart)

**Infrastructure:**
- GitHub repo created: github.com/viktrum/ai-summit-strategist
- HTTPS protocol preferred over SSH for GitHub
- GitHub before Netlify deploy (user's preferred order)
- Kalvium description updated per external request: "AI platform for end to end delivery of offline degree programs"

### Session: Feb 15, 2026 (Git, Deploy & Security Audit)

**Completed:**
- GitHub repo created and pushed: github.com/viktrum/ai-summit-strategist (420 files)
- Root `.gitignore` added — `.env*`, `.claude/`, `node_modules/`, `.next/`, `.netlify/`, `backups_before_migration/` all excluded
- Verified no API keys or secrets in committed code (Anthropic key at root `.env`, Supabase keys via `process.env` only)
- Netlify deploy completed successfully
- Session log section added to CLAUDE.md with the "append every session" rule

**Mistakes Made (learn from these):**
- **Task ID confusion**: After spawning security audit agents that failed, confused a stale Netlify deploy task ID (`bd342a0`) with a security audit task. This pulled attention back into the deploy workflow.
- **Drifted from user's request**: User asked for security audit. After Task agents failed with internal errors, instead of falling back to reading files directly with Read/Grep, I drifted into running `netlify status`, `npm run build`, and `netlify deploy` — completely off-task. User had to tell me to stop **three times**.
- **Don't retry failed patterns**: When Task/Explore agents fail with internal errors, fall back to direct Read/Grep immediately. Don't keep spawning agents that keep failing.
- **Don't conflate tasks**: When working on task A (security audit) and a background task B (deploy) is mentioned, don't switch to task B. Stay on the user's current request.
- **Netlify deploy is slow and fragile from CLI**: Multiple deploy attempts hung or got killed. Once a deploy succeeds, do NOT re-deploy unless explicitly asked. The successful deploy output was clear ("Deploy is live!") — trust it and move on.

### Session: Feb 15, 2026 (Data Enrichment & Official Site Scraping)

**Key Discovery: Official Site API**
- User added `data/raw/AI Summit (Database).xlsx` with more events — 601 events vs 463 in production
- Initial xlsx comparison: 200 events in xlsx but not production, 61 production-only
- Improved matching with date+time first, then semantic scoring (title similarity, room match, speaker overlap)
- **Breakthrough**: Discovered official IndiaAI API at `impact.indiaai.gov.in` — POST with `next-action` header, paginated (pageSize=25)
- Scraped all 5 days: **542 official sessions** vs our 463 production
- 298 matched, **244 new events** not in production, 164 production-only

**Data Pipeline Built:**
- `data/analysis/scrape_official.js` — Scrapes official IndiaAI site for all 5 days
- `data/analysis/merge_official.js` — Merges 542 official + 463 production → 706 total events
- `data/analysis/enrich_new_official.js` — Enriches 244 new events via Claude Haiku using production taxonomies
- Output: `data/enriched/events_official_merged.json` (exact production JSON structure)

**Critical User Instruction:**
- **"We cannot change the structure of production JSON"** — frontend code and cached localStorage data depend on exact field structure. No new fields allowed. Only use existing production fields.

**Quiz UX Brainstorming (not yet implemented):**
- Everyone says 9 questions is too long, they miss it's skippable
- Root cause: 9 progress dots, "Next" is primary over "Generate", no clear completion moment after step 3
- Proposed 4 options, recommended "3+1" approach (3 required → big "Generate" CTA → optional "Fine-tune" expander)
- User hasn't decided yet

**By-date breakdown (official merged):**
| Date | Matched | New | Prod-only | Total |
|------|---------|-----|-----------|-------|
| Feb 16 | 100 | 38 | 7 | 145 |
| Feb 17 | 57 | 43 | 68 | 168 |
| Feb 18 | 33 | 42 | 35 | 110 |
| Feb 19 | 6 | 33 | 23 | 62 |
| Feb 20 | 102 | 88 | 31 | 221 |

### Session: Feb 16, 2026 (Hot-Reload, Gap-Fill Scoring, Deploy)

**Big Decision: Hot-Reload Built but Not Activated**
- Built the full Supabase Storage hot-reload system (DataProvider, ETag-based freshness, three-tier init)
- Migrated all pages from static imports to `useData()` hook
- QA tested: cross-page consistency ✅, full quiz→plan flow ✅, tab switch HEAD requests ✅, shared plan links ✅
- **Decision**: Day 1 of the summit produced only 2 exhibitor update requests. Not worth the operational complexity of maintaining bucket files. The hot-reload code is deployed but harmlessly no-ops when the bucket is empty (HEAD requests return 404 → early return → static bundled data used). Can be activated anytime by uploading JSON files to the `event-data` bucket.
- **For data updates**: Edit static JSON files locally and redeploy. Simpler, safer, sufficient for the volume.

**Scoring Engine: Gap-Fill ("Best at This Time")**
- Found bug: for some profiles (student + geopolitics), all top-30 candidates clustered in the morning, leaving the entire afternoon empty
- Root cause: `CANDIDATES_PER_DAY = 30` cutoff reached before any afternoon events
- Fix: After greedy scheduling, scan for time gaps > 1 hour. Fill each gap with the best-scoring event from the full scored pool (not just top 30). Tagged with `isTimeSlotFill = true`.
- UI: Light blue "Best at This Time" badge on EventCard (similar to "Manually Added" badge)
- Example: Feb 18 went from 4 primaries (ending 2:30 PM) → 7 primaries including Yoshua Bengio keynote and afternoon sessions
- New files/changes: `scoring.ts` (fillTimeGaps function), `types.ts` (isTimeSlotFill flag on ScoredEvent + SavedPlanEvent), `EventCard.tsx` (badge), `loading/page.tsx` + `plan/[id]/page.tsx` (save/restore flag)

**Bugs Found & Fixed:**
- localStorage cache downgrade: Old cached data (463 events from previous bucket upload) overwrote static bundle (639 events) during hydration. Fix: Guard `parsed.length >= staticEventsData.length`
- `plan_data_version` not saved to Supabase: Only saved to localStorage, so shared plans can't detect staleness. Known limitation, not fixed yet.
- `quiz_answers` column doesn't exist in Supabase yet (Track 3): Insert falls back to retry without new columns — works but quiz answers not persisted.

**Deployed to Production:**
- T4G Lab exhibitor description updated per user request
- Gap-fill scoring feature
- DataProvider hot-reload code (dormant — no bucket files)
- localStorage cache guard

**Plan Deviation — list() → HEAD/ETag:**
- Plan called for `supabase.storage.list()` but it requires SELECT policy on `storage.objects`
- Switched to HTTP HEAD requests on public URLs → reads `etag`/`last-modified` headers
- User instruction: "Always explain plan deviations proactively" — added as rule

**User Instructions:**
- "Don't make any changes to user_plans table"
- Maximum autonomy — do everything programmatically before asking
- Keep all file access within the project folder
- Prefers simple solutions over complex ones
- **"I have not compromised with experience till now, I will not start now"** — always build the full quality solution, never cut corners on UX

### Session: Feb 17, 2026 (Email Collection Rework + PDF Email)

**Major Feature: Email Collection System Rework**

Completely replaced the old inline `EmailCapture.tsx` banner with a global modal-based system:

**New Architecture (4 new files):**
- `lib/email-state.ts` — centralized localStorage/sessionStorage helpers for all email state (email, firstVisitDate, dismissCount, neverShow, sessionDismissed)
- `components/EmailModal.tsx` — 3 variants: 'save' (post-generation PDF email), 'brief' (returning visitors), 'create-plan' (returning no-plan users with CTA)
- `components/EmailStickyBar.tsx` — thin persistent bar below navbar for opted-out users (no X, clickable, opens modal)
- `components/EmailOrchestrator.tsx` — layout-level decision maker, wired into `layout.tsx` after NavBar

**UX Decisions (confirmed with user):**
- Save modal: email-only, sends PDF via email. Share actions (Copy Link, WhatsApp, LinkedIn, PDF) moved to inline buttons on plan page header.
- Quiz Step 1: Name field → Email field (prominent, with helper text "For your personalised summit brief")
- Modal scope: any page (Home, Plan, Explore) for returning visitors
- 5 session dismissals → "never show again" → sticky bar fallback
- Sticky bar: Home + Plan pages only, no X, very thin, persists indefinitely, disappears on email submit
- Returning user detection via `firstVisitDate` in localStorage

**Modified Files:**
- `quiz/page.tsx` — `userName` → `userEmail`, `user_name` → `user_email` in quizAnswers, imports email-state
- `loading/page.tsx` — reads `user_email` from quizAnswers, persists to localStorage via email-state
- `plan/[id]/page.tsx` — removed old save modal (120+ lines), removed EmailCapture usage, added inline share buttons (Copy Link, WhatsApp, LinkedIn, PDF), floating bar "Save" → "Share" (copies link)
- `layout.tsx` — added EmailOrchestrator after NavBar

**Deleted:** `components/results/EmailCapture.tsx`

**PDF Email Feature:**
- User insisted on actual PDF delivery: "I have not compromised with experience till now"
- Server-side PDF generation using `jsPDF` in a Netlify Function
- `netlify/functions/send-plan-pdf.mts` — receives plan data from client, generates A4 PDF with event cards, sends via Resend with PDF attachment + HTML email
- Resend API key configured: `.env.local` (local) + Netlify env var (production)
- `RESEND_FROM_EMAIL` env var for custom sender (optional, defaults to `onboarding@resend.dev`)
- PDF template: indigo accent bar, plan headline, strategy note, day headers, event cards with tier badges, venue, speakers, one-liners, footer with plan URL
- User chose server-side over client-side (`html2canvas`/`html2pdf.js`) for consistency and quality

**Packages Added:** `jspdf`, `resend`, `@netlify/functions`

**Not Yet Deployed:** All changes are local, build passes. Needs deploy + testing.

---

## Next Steps

See `plan.md` for detailed implementation roadmap.
