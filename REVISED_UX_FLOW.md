# AI Summit Strategist — Revised UX Flow & Implementation Spec

## Context for the Coding Agent

This document replaces `docs/UX_FLOW.md` as the definitive UX specification. The redesign prompt (`REDESIGN_PROMPT.md`) handles visual design. This document handles **functional flow, quiz design, plan interactivity, and data architecture**.

The core changes from the previous flow:
1. **Smarter quiz** — 8-9 questions mapped to enriched event metadata, but users can generate after question 3
2. **Editable plan** — users can swap, dismiss, and pin events post-generation
3. **Integrated event browsing** — swap events via a bottom sheet showing all alternatives in that time slot
4. **Calendar export** — ICS download + Google Calendar deeplinks per event
5. **Landing page simplified** — just a hook + CTA; date selection moves to quiz step 1

---

## Revised Page Map

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/` | Entry hook, social proof, CTA to quiz. Also links to Explore. |
| Quiz | `/quiz` | 8-9 step progressive quiz (can generate after step 3) |
| Loading | `/loading` | Terminal animation while strategy generates |
| Plan | `/plan/local` or `/plan/[id]` | Interactive, editable personalized schedule |
| Explore | `/explore` | Standalone event browser (unchanged, still accessible from landing) |

---

## Revised Flow Diagram

```
[Landing /]
    │
    ├── "Build My Strategy" ──► [Quiz /quiz]
    │                              │
    │                              ├── Steps 1-3 (required): Dates → Role → Interests
    │                              │     └── "Generate Now" appears from step 3 onward
    │                              ├── Steps 4-9 (optional): Missions → Depth → Networking Style → Company Size → Sector Focus → Deal Breakers
    │                              │     └── "Generate" available at every step from 3+
    │                              │
    │                              └── "Generate My Strategy" ──► [Loading /loading]
    │                                                                    │
    │                                                                    ▼
    │                                                          [Plan /plan/local]
    │                                                                    │
    │                                                                    ├── Swap event ──► [Bottom Sheet: Slot alternatives]
    │                                                                    ├── Dismiss event ──► removes from plan
    │                                                                    ├── Pin event ──► locks it during regeneration
    │                                                                    ├── Export ──► ICS download / Google Calendar deeplinks
    │                                                                    ├── Share ──► copy URL
    │                                                                    └── Start Over ──► [Landing /]
    │
    └── "Explore All Events" ──► [Explore /explore]
                                       │
                                       └── "Home" ──► [Landing /]
```

---

## 1. Landing Page (`/`)

### What Changes
- **Date selector removed** — moves to quiz step 1
- **Simpler hero** — just headline, subheadline, one CTA
- **Social proof** — stats row stays (463 events, 715 exhibitors, 31 heavy hitters)
- **Explore preview** — keep the 6 featured heavy-hitter cards + "View All Events" link

### Elements

| Element | Type | Description |
|---------|------|-------------|
| Overline | Text | "INDIA AI IMPACT SUMMIT 2026" — uppercase, small, tertiary |
| Headline | H1 | "Don't Waste Your Time at the India AI Summit" |
| Subheadline | Text | "463 events. 5 days. We'll build your personalized networking strategy in 30 seconds." |
| CTA | Primary button (large) | "Build My Strategy →" |
| Stats row | 3 cards | Events (463), Exhibitors (715), Heavy Hitters (31) |
| Explore section | Section | "Featured Sessions" — 6 heavy-hitter cards |
| View All Events | Link | → `/explore` |
| Footer note | Text | "Free. No signup. Takes 30 seconds." |

### Actions

| Action | Result |
|--------|--------|
| "Build My Strategy" | Navigate to `/quiz` |
| "View All Events" | Navigate to `/explore` |

### What's Removed
- Date selector buttons (moved to quiz)
- Any reference to dates on the landing page

---

## 2. Quiz Page (`/quiz`)

### Core Design Principle

**Progressive disclosure with early escape.** Steps 1-3 are mandatory and give enough signal for a reasonable plan. Steps 4-9 are optional upgrades — each one makes the plan sharper. The user always sees a "Generate My Strategy" button from step 3 onward, plus a subtle "Skip to results" affordance.

**Spotify onboarding feel**: One question per screen. Bold question text. Large, easy tap targets. Smooth slide transitions between steps. Thin progress bar at top.

### Progress Bar Behavior
- Steps 1-3: Progress bar fills 0% → 33% → 66% → 100% of the "required" section
- After step 3: Progress bar shows "bonus" section filling (visual distinction — e.g., the bar changes to a dotted or lighter style after the required portion)
- Alternative: Show "3 of 3 required done ✓ — keep going for better results" text

### Step Layout (every step)
```
┌─────────────────────────────┐
│ ← Back          Step 2 of 9 │  ← Ghost button + step counter
│ ═══════════░░░░░░░░░░░░░░░░ │  ← Progress bar
│                              │
│ What topics pull you in?     │  ← Bold question (22-28px)
│ Pick up to 3.                │  ← Subtitle (13px, tertiary)
│                              │
│ ┌──────┐ ┌──────┐ ┌──────┐  │
│ │ Pill │ │ Pill │ │ Pill │  │  ← Selection UI (varies by step)
│ └──────┘ └──────┘ └──────┘  │
│ ┌──────┐ ┌──────┐ ┌──────┐  │
│ │ Pill │ │ Pill │ │ Pill │  │
│ └──────┘ └──────┘ └──────┘  │
│                              │
│         2 of 3 selected      │  ← Counter (if applicable)
│                              │
│  ┌──────────────────────┐    │
│  │     Next →            │    │  ← Primary button (sticky bottom on mobile)
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │  ← Only visible from step 4+
│  │  Skip · Generate now  │    │  ← Ghost/link style
│  └──────────────────────┘    │
└─────────────────────────────┘
```

### The 9 Steps

Below is each step, its question, options, selection type, and which enriched event field it maps to for scoring.

---

#### Step 1: Dates (REQUIRED)
**Question**: "Which days are you attending?"
**Subtitle**: "Feb 16–20, 2026. Pick all that apply."
**UI**: Date cards in a horizontal row (same design as before but inside the quiz now)
**Selection**: Multi-select, minimum 1
**Options**:
```
Mon Feb 16 | Tue Feb 17 | Wed Feb 18 | Thu Feb 19 | Fri Feb 20
```
**Maps to**: `event.date` — hard filter, events on unselected dates are excluded entirely
**Validation**: Must select ≥1 day to proceed

---

#### Step 2: Role (REQUIRED)
**Question**: "What best describes you?"
**Subtitle**: "This helps us find the right rooms."
**UI**: 2×3 grid of role cards (icon + label)
**Selection**: Single-select
**Options**:
```
🚀 Founder / CXO
💰 Investor / VC
📊 Product Leader
⚙️ Engineer / Researcher
🏛️ Policy / Government
🎓 Student / Academic
```
**Maps to**: `event.target_personas` — each role maps to a set of target personas:
| Role | Persona matches |
|------|----------------|
| Founder / CXO | "Founders", "CXO", "Innovation & Strategy Leaders", "Business Leaders" |
| Investor / VC | "Investors", "VCs", "Impact Investors", "Angel Investors" |
| Product Leader | "Product Managers", "Innovation & Strategy Leaders", "Business Leaders" |
| Engineer / Researcher | "AI Researchers", "ML Engineers", "Data Scientists", "Engineers" |
| Policy / Government | "Government & Policy Leaders", "Regulators", "Policy Makers" |
| Student / Academic | "Students", "Academics", "AI Researchers" |

Also maps to `technical_depth` preference:
| Role | Preferred depth range |
|------|----------------------|
| Founder / CXO | 2-3 |
| Investor / VC | 2-3 |
| Product Leader | 3-4 |
| Engineer / Researcher | 4-5 |
| Policy / Government | 1-3 |
| Student / Academic | 3-5 |

---

#### Step 3: Interests (REQUIRED)
**Question**: "What topics pull you in?"
**Subtitle**: "Pick up to 3."
**UI**: Pill buttons, flex-wrap
**Selection**: Multi-select, 1-3
**Options** (mapped to `event.keywords.category`):
```
LLMs & Foundation Models        → category: "Specialized AI Domains", keywords: "LLMs", "Foundation Models", "Generative AI"
Agentic AI & Autonomous Systems → category: "Specialized AI Domains", keywords: "Agentic AI", "Autonomous Systems"  
Compute, Cloud & Infrastructure → category: "AI Infrastructure & Compute", keywords: "AI Compute", "Cloud", "Semiconductors"
AI Safety & Governance          → category: "AI Governance & Ethics", keywords: "AI Safety", "AI Governance", "Responsible AI"
Startups & Venture Capital      → category: "Innovation & Ecosystem", keywords: "Startups", "Venture Capital", "Funding"
Enterprise AI Adoption          → category: "Industry & Enterprise AI", keywords: "Enterprise AI", "Digital Transformation"
Health, Agri & Social Impact    → category: "Sector-Specific AI Applications", keywords: "Healthcare AI", "AgriTech", "Social Impact"
Geopolitics & Global AI Policy  → category: "Geopolitics & Global Strategy", keywords: "Global South", "Digital Sovereignty"
```

**🎯 FROM HERE, "Generate My Strategy" BECOMES AVAILABLE**

After step 3, the bottom area shows two buttons:
```
┌──────────────────────────┐
│  Next: Refine further →  │   ← Primary button (continues quiz)
└──────────────────────────┘
    Generate with basics ↗      ← Text link (skips to loading)
```
The link text evolves at each subsequent step:
- After step 3: "Generate with basics"
- After step 4: "Generate now (good)"
- After step 5: "Generate now (better)"
- After step 6+: "Generate now (great)"

This creates gentle FOMO to continue without blocking progress.

---

#### Step 4: Mission (OPTIONAL — enhances plan)
**Question**: "What's your #1 mission at the summit?"
**Subtitle**: "Pick up to 2."
**UI**: Pill buttons
**Selection**: Multi-select, 1-2
**Options** (mapped to `event.goal_relevance`):
```
Finding talent / Hiring         → goal_relevance: "hiring"
Fundraising / Meeting investors → goal_relevance: "fundraising"
Finding customers / Partnerships→ goal_relevance: "sales", "partnerships"
Deep learning / Upskilling      → goal_relevance: "upskilling"
Pure networking / Serendipity   → goal_relevance: "networking"
```
**Impact**: Boosts events matching the selected `goal_relevance` values. Also influences which `networking_signals` to prioritize (e.g., "Fundraising" boosts events with `investor_presence: "Likely"`).

---

#### Step 5: Technical Depth (OPTIONAL — sharpens matching)
**Question**: "How technical do you want your sessions?"
**Subtitle**: "From big-picture strategy to deep research."
**UI**: Single horizontal slider or 5 labeled buttons in a row
**Selection**: Single-select
**Options**:
```
1 ── Policy & Vision       (suited for: government officials, non-technical CXOs)
2 ── Leadership & Strategy  (suited for: CXOs, business leaders, investors)
3 ── Implementation Focus   (suited for: product leaders, consultants, managers)
4 ── Technical Deep-Dive    (suited for: engineers, researchers, technical PMs)
5 ── Research Frontier      (suited for: ML researchers, PhD-level discussions)
```
**Maps to**: Overrides the role-inferred `technical_depth` range. Events are filtered to `selected_depth ± 1`.
**Default if skipped**: Uses role-inferred depth from Step 2.

---

#### Step 6: Networking Density (OPTIONAL — shapes room selection)
**Question**: "What kind of rooms do you want to be in?"
**Subtitle**: "Think about who you want around you."
**UI**: 2-3 card options (icon + title + one-line description)
**Selection**: Single-select
**Options**:
```
🎯 High-power rooms
   "CEOs, ministers, decision-makers. Smaller rooms, bigger names."
   → Boosts events with decision_maker_density: "High" and is_heavy_hitter: true

🌊 High-volume rooms  
   "Large audiences, diverse attendees. More chances for unexpected connections."
   → Boosts events at Bharat Mandapam main halls, larger sessions

⚖️ Balanced mix
   "Some VIP sessions, some broader ones. Best of both worlds."
   → Default behavior, no special boosting
```
**Maps to**: `networking_signals.decision_maker_density` and `networking_signals.is_heavy_hitter`. Also influences venue preference (Bharat Mandapam plenary vs. meeting rooms).

---

#### Step 7: Organization Size (OPTIONAL — refines persona matching)
**Question**: "What size organization are you at?"
**Subtitle**: "Helps us match you with relevant peers."
**UI**: Pill buttons
**Selection**: Single-select
**Options**:
```
Solo / Pre-revenue startup
Early-stage startup (seed to Series B)
Growth-stage / Scale-up
Large enterprise / MNC
Government / NGO / Academic
Between roles / Exploring
```
**Maps to**: Refines `target_personas` matching. E.g., "Early-stage startup" boosts events with personas "Founders", "VCs", and knowledge partners that are incubators/accelerators. "Large enterprise" boosts events with "Business Leaders", "Enterprise AI" keywords.
**Also used for**: Generating more contextual icebreakers — knowing "Series A founder" vs. "enterprise PM" produces very different conversation starters.

---

#### Step 8: Sector Focus (OPTIONAL — vertical matching)
**Question**: "Which sectors are you closest to?"
**Subtitle**: "Pick up to 2."
**UI**: Pill buttons
**Selection**: Multi-select, 1-2
**Options**:
```
Developer Tools & SaaS
Fintech & Financial Services
Healthcare & Biotech
E-commerce & Retail
EdTech & Skilling
Manufacturing & Industrial
Agriculture & Climate
Defense & Cybersecurity
Media & Entertainment
Government & Public Sector
```
**Maps to**: `event.keywords` — sector-specific keyword matching. Also influences which `knowledge_partners` are relevant (e.g., "Fintech" → JPMorganChase, Mastercard, Razorpay partner events get boosted).

---

#### Step 9: Deal Breakers (OPTIONAL — negative filters)
**Question**: "Anything you want to avoid?"
**Subtitle**: "We'll keep these out of your plan."
**UI**: Pill buttons
**Selection**: Multi-select, 0-3
**Options**:
```
Pure policy / governance panels
Highly technical research sessions
Sessions focused on Global South development
Large keynote-only sessions (no interaction)
Sessions at Sushma Swaraj Bhavan (far venue)
```
**Maps to**: Negative scoring. Selected items get a heavy penalty (-30 to -50 score points). The Sushma Swaraj Bhavan option maps to `event.venue` filter.
**If skipped**: No negative filters applied (default behavior).

---

### Quiz Data Flow

When the user clicks "Generate My Strategy" (at any point from step 3+):

```javascript
// Save to localStorage
const quizAnswers = {
  dates: ["2026-02-19", "2026-02-20"],        // Step 1 (required)
  role: "product_leader",                       // Step 2 (required)
  interests: ["agentic_ai", "enterprise_ai"],   // Step 3 (required)
  // Everything below may be null if user skipped
  missions: ["networking", "upskilling"],        // Step 4
  technical_depth: 3,                            // Step 5
  networking_density: "high_power",              // Step 6
  org_size: "growth_stage",                      // Step 7
  sectors: ["developer_tools", "fintech"],       // Step 8
  deal_breakers: ["sushma_swaraj_bhavan"],       // Step 9
  completedSteps: 6,                             // How far they got
}

localStorage.setItem('quizAnswers', JSON.stringify(quizAnswers))
```

Navigate to `/loading`.

---

### LinkedIn Profile Tab

**Keep it** as an alternative tab on the quiz page, but it's secondary — the tab bar shows "Quick Quiz" (default) and "Paste Profile". The profile tab has:
- Textarea (min 20 chars, max 3000 chars)
- Character counter
- "Generate My Strategy" button
- When used, it bypasses the quiz entirely and sets `quizAnswers.mode = "profile"` with the raw text.

---

## 3. Loading Page (`/loading`)

### No Changes to Concept
Same terminal animation. Same auto-redirect to `/plan/local`.

### Updated Terminal Lines
Adjust to reflect the smarter quiz:
```
> Initializing AI Summit Strategist...
> Reading your profile... (matched: Product Leader)
> Filtering {n} events across {d} days...
> Scoring against your interests: Agentic AI, Enterprise AI...
> Identifying high-power networking rooms...
> Calculating ROI scores for top candidates...
> Resolving time conflicts...
> Generating icebreakers and strategy...
> Building your personalized plan...
✓ Strategy complete! Redirecting...
```
Lines 2-5 should dynamically reference the user's actual quiz answers (role, interests, etc.) to make it feel personalized.

---

## 4. Plan Page (`/plan/local` or `/plan/[id]`)

### What Changes
This is the biggest functional change. The plan page becomes **interactive and editable**.

### Page Structure

```
┌─────────────────────────────────┐
│ ← Start Over          Share 📋  │
│                                  │
│ INDIA AI IMPACT SUMMIT 2026      │  ← Overline
│ The Product Leader Track         │  ← Dynamic headline (H1)
│ "Focus on agentic AI roundtables │
│  and enterprise sessions..."     │  ← Strategy note
│                                  │
│ 12 events · 2 days · 8 exhibs   │  ← Inline stats
│ ┌────────────────────────────┐   │
│ │  📅 Export to Calendar     │   │  ← ICS download button
│ └────────────────────────────┘   │
│                                  │
│ ━━━ Thursday, Feb 19 (4 events)  │  ← Day header
│                                  │
│ 10:30 AM                         │  ← Timeline time
│ ●──┐                             │  ← Timeline dot (tier-colored)
│    │ ┌────────────────────────┐  │
│    │ │ [Must Attend] [⚡HH] [92]│ │  ← Event card
│    │ │ Agentic AI Roundtable   │  │
│    │ │ 📍 Bharat Mandapam...   │  │
│    │ │                         │  │
│    │ │ "Senior leaders debate..."│ │  ← One-liner
│    │ │                         │  │
│    │ │ ┌─────┐ ┌──────┐ ┌───┐ │  │
│    │ │ │ Pin │ │ Swap │ │ ✕ │ │  │  ← ACTION BUTTONS (NEW)
│    │ │ └─────┘ └──────┘ └───┘ │  │
│    │ │                         │  │
│    │ │ ▾ Networking Intel      │  │  ← Expandable accordion
│    │ └────────────────────────┘  │
│    │                             │
│ 11:30 AM                         │
│ ●──┐                             │
│    │ ┌─── next card ──────────┐  │
│    ...                           │
│                                  │
│ ━━━ Friday, Feb 20 (8 events)    │
│    ...                           │
│                                  │
│ ━━━ Exhibitors to Visit (8)      │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐        │  ← Horizontal scroll
│ └───┘ └───┘ └───┘ └───┘        │
│                                  │
│ 📅 Export to Calendar            │  ← Repeated at bottom
│ 🔄 Build a new strategy         │
│                                  │
│ Generated by AI Summit Strategist│
└─────────────────────────────────┘
```

### Event Card Actions (NEW)

Each event card gets three small action buttons at the bottom, below the one-liner but above the networking intel accordion:

| Button | Icon | Label | Action |
|--------|------|-------|--------|
| Pin | 📌 | "Pin" / "Pinned" | Locks this event. If user regenerates, pinned events stay. Toggle state. |
| Swap | 🔄 | "Swap" | Opens bottom sheet with alternative events in the same time slot |
| Dismiss | ✕ | (no label) | Removes this event from the plan with a brief undo toast |

**Visual treatment**: Small ghost-style buttons in a row. Not prominent — they should feel like power-user tools, not the primary interface. `12px` text, `--text-tertiary` color, icon + short label.

#### Pin Behavior
- Pinned events get a subtle visual indicator (e.g., a small pin icon on the badge row, or a thin left border in `--accent-secondary`)
- Pinned state is saved to `localStorage` alongside the plan
- If the user starts over and re-generates, pinned events are preserved in the new plan (if they fall on selected dates)

#### Dismiss Behavior
- Card animates out (fade + collapse height, 300ms)
- A toast appears at the bottom: "Event removed. **Undo**" — visible for 4 seconds
- Clicking "Undo" re-inserts the card with an animation
- Dismissed events are tracked in `localStorage` so they don't reappear on page reload

#### Swap Behavior (Bottom Sheet)
When user taps "Swap" on an event card:

1. A bottom sheet slides up (on mobile) or a modal appears (on desktop)
2. **Header**: "Alternatives at 10:30 AM, Feb 20" + "✕" close button
3. **Current event**: Shown at top with a "Currently selected" label, slightly muted
4. **Alternative events**: All other events that overlap with this time slot, ordered by their networking ROI score (descending)
5. Each alternative shows:
   - Title
   - Tier badge + score badge
   - Venue + room
   - One-liner
   - "Select this" button
6. Tapping "Select this" on an alternative:
   - Closes the bottom sheet
   - Swaps the event in the plan (old one animates out, new one animates in)
   - The new event inherits the time slot position
   - The swapped-out event becomes available as an alternative for future swaps
7. **"Browse all events at this time"** link at the bottom of the sheet → opens the full list (not just scored alternatives)

**Data for alternatives**: The scoring engine should store not just the selected events but also the top 3-5 alternatives per time slot in `planResult`. Structure:
```javascript
planResult.schedule[i] = {
  event_id: "primary_event",
  // ... all existing fields ...
  alternatives: [
    { event_id: "alt_1", title: "...", tier: "Should Attend", score: 78, venue: "...", one_liner: "..." },
    { event_id: "alt_2", title: "...", tier: "Nice to Have", score: 65, venue: "...", one_liner: "..." },
  ]
}
```

### Calendar Export (NEW)

#### Full Plan ICS Export
A button at the top and bottom of the plan page: "📅 Export to Calendar"
- Generates a single `.ics` file with all plan events
- Each event in the ICS includes:
  - `SUMMARY`: Event title
  - `DTSTART` / `DTEND`: Start and end time (use start_time + 60 min if end_time is null)
  - `LOCATION`: Venue, Room
  - `DESCRIPTION`: One-liner + speakers + "Strategy: [networking tip]"
- File downloads immediately on tap

#### Per-Event Google Calendar Link
Each event card gets a small "Add to Calendar" icon button (📅) in the meta row.
- Generates a Google Calendar deeplink:
```
https://calendar.google.com/calendar/render?action=TEMPLATE
  &text={title}
  &dates={start}/{end}  (in YYYYMMDDTHHmmssZ format)
  &location={venue}, {room}
  &details={one_liner}%0A%0ASpeakers: {speakers}%0A%0AStrategy: {networking_tip}
```
- Opens in new tab

### Share Plan
Same as before — copies URL to clipboard, shows toast. Future: `/plan/[uuid]` for persistent sharing via Supabase.

---

## 5. Explore Page (`/explore`)

### Minimal Changes
The explore page stays as a standalone event browser. No functional changes, only the visual redesign from `REDESIGN_PROMPT.md`.

Keep:
- Search bar
- Filter panel (date, topics, venue, depth, heavy hitters)
- Collapsible event cards
- "Home" navigation

---

## 6. Data Flow Summary

### localStorage Keys

| Key | Written By | Read By | Structure |
|-----|------------|---------|-----------|
| `quizAnswers` | Quiz page | Loading page | `{ dates, role, interests, missions?, technical_depth?, networking_density?, org_size?, sectors?, deal_breakers?, completedSteps, mode? }` |
| `planResult` | Loading page | Plan page | `{ headline, strategyNote, schedule: [{ event_id, tier, score, alternatives: [...], ...}], exhibitors: [...] }` |
| `planEdits` | Plan page | Plan page | `{ pinned: [event_ids], dismissed: [event_ids], swapped: {slot_time: new_event_id} }` |

### New: `planEdits` Key
This tracks user edits to the generated plan. It's separate from `planResult` so the original AI output is preserved.

```javascript
{
  pinned: ["event_123", "event_456"],       // User pinned these
  dismissed: ["event_789"],                  // User dismissed these
  swapped: {
    "2026-02-20T10:30": "event_alt_101",    // User swapped the 10:30 slot to this event
  }
}
```

The plan page reads both `planResult` and `planEdits`, applies edits on top of the original plan, and renders the merged result.

---

## 7. Scoring Engine Updates

The scoring engine (in `/loading`) needs to account for the expanded quiz:

### Scoring Weights (updated)

| Signal | Weight | Source |
|--------|--------|--------|
| Persona match | 20% | Step 2 (role) → `target_personas` |
| Keyword/interest match | 20% | Step 3 (interests) → `keywords` |
| Goal relevance match | 15% | Step 4 (missions) → `goal_relevance` |
| Technical depth fit | 10% | Step 5 or role-inferred → `technical_depth` |
| Networking signal match | 15% | Step 6 (density) → `networking_signals` |
| Sector match | 10% | Step 8 (sectors) → `keywords`, `knowledge_partners` |
| Speaker seniority | 10% | Derived from speaker titles |

### Negative Scoring (Deal Breakers, Step 9)
Each selected deal breaker applies a `-40` penalty to matching events.

### Fallback for Skipped Steps
If a step is skipped (`null` in `quizAnswers`):
- **Mission** (step 4): Default to `["networking"]` — safest assumption
- **Technical depth** (step 5): Use role-inferred range
- **Networking density** (step 6): Default to "balanced"
- **Org size** (step 7): Ignored in scoring
- **Sectors** (step 8): No sector boost applied
- **Deal breakers** (step 9): No penalties applied

### Alternatives Generation
For each selected event in the plan, the engine must also output 3-5 alternatives:
- Same time slot (overlapping `start_time` on the same `date`)
- Sorted by score descending
- Include: `event_id`, `title`, `tier`, `score`, `venue`, `room`, `one_liner`

---

## 8. Quiz → Scoring Mapping Cheat Sheet

This is the complete mapping table for the coding agent to implement:

```
QUIZ ANSWER              →  EVENT FIELD              →  SCORING ACTION
─────────────────────────────────────────────────────────────────────
dates[]                  →  event.date               →  Hard filter (exclude non-matching)
role                     →  event.target_personas     →  +20 if persona matches
role                     →  event.technical_depth     →  Infer preferred depth range
interests[]              →  event.keywords            →  +20 per keyword category match
missions[]               →  event.goal_relevance      →  +15 per goal match
missions["fundraising"]  →  networking_signals         →  Boost investor_presence: "Likely"
missions["hiring"]       →  networking_signals         →  Boost decision_maker_density: "High"
technical_depth          →  event.technical_depth      →  +10 if within ±1, -20 if outside ±2
networking_density       →  networking_signals         →  Boost based on preference
org_size                 →  (refines persona matching) →  Adjusts persona weights
sectors[]                →  event.keywords             →  +10 per sector keyword match
deal_breakers[]          →  various                    →  -40 penalty per match
(always)                 →  event.venue                →  -15 if Sushma Swaraj Bhavan (unless top 10%)
```

---

## 9. Implementation Priority

For the coding agent, implement in this order:

### Phase 1: Quiz Revamp
1. Move date selection from landing to quiz step 1
2. Simplify landing page (remove date selector)
3. Implement all 9 quiz steps with the Spotify-style UI
4. Add "Generate now" escape hatch from step 3 onward
5. Update localStorage schema for expanded `quizAnswers`

### Phase 2: Plan Interactivity
6. Add Pin / Swap / Dismiss buttons to event cards
7. Implement bottom sheet for swap alternatives
8. Add `planEdits` localStorage layer
9. Implement undo toast for dismiss
10. Update scoring engine to output alternatives per slot

### Phase 3: Calendar Export
11. Implement ICS file generation and download
12. Add per-event Google Calendar deeplinks

### Phase 4: Polish
13. Dynamic terminal lines referencing quiz answers
14. Progress bar behavior (required vs optional visual split)
15. Animations for swap/dismiss/pin interactions
16. Empty states and edge cases

---

## 10. Edge Cases to Handle

| Scenario | Behavior |
|----------|----------|
| User selects only 1 day | Plan shows events for that day only. Minimum 3 events. |
| User skips all optional steps | Plan generates with steps 1-3 only. Quality label: "Basic plan — retake quiz for better results" |
| User dismisses all events in a day | Show empty state: "No events for this day. Tap to restore dismissed events." + "Restore all" button |
| User swaps to an event that conflicts with another pinned event | Show conflict warning: "This overlaps with [pinned event]. Continue anyway?" |
| All alternatives in a slot are dismissed | Bottom sheet shows: "No more alternatives. Browse all events →" link to explore page filtered to that time slot |
| LinkedIn profile mode | Skip quiz entirely, go straight to loading. `quizAnswers.mode = "profile"`. Scoring uses LLM-extracted profile instead of quiz mapping. |
| User returns to plan page (already generated) | Load from `planResult` + `planEdits` in localStorage. No re-generation. |
| Share URL with no localStorage | Future: load from Supabase. Current: redirect to `/` with message "Plan not found. Build a new one." |
