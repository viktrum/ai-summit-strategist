# AI Summit Strategist — UX Flow

Full specification of the user experience: pages, elements, actions, and navigation. Anyone reading this should be able to map every screen, element, and interaction.

---

## Overview

**Product**: AI Summit Strategist — personalized networking itineraries for India AI Impact Summit (Feb 16–20, 2026).

**Flow**: Landing → Quiz (or Profile) → Loading → Plan.  
**Bypass**: Explore Events is available from the landing page and does not require a strategy.

---

## Page Map

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/` | Entry point, date selection, CTA to strategy |
| Quiz | `/quiz?dates=...` | Role, interests, missions (or paste LinkedIn) |
| Loading | `/loading` | Terminal-style animation while strategy is generated |
| Plan | `/plan/local` or `/plan/[id]` | Personalized event schedule + exhibitors |
| Explore | `/explore` | Browse all 463 events with filters |

---

## 1. Landing Page (`/`)

### Elements

| Element | Type | Description |
|--------|------|-------------|
| Summit badge | Pill | "India AI Impact Summit 2026" with Calendar icon |
| Headline | H1 | "Don't Waste Your Time at the India AI Summit" |
| Subheadline | Gradient text | "Get Your High-ROI Networking Strategy in 30 Seconds" |
| Description | Paragraph | "463 events. 715 exhibitors. 5 days. We'll find the 10–12 that matter most for **your** career." |
| Date selector | Button group | 5 toggle buttons (Feb 16–20), each shows day + date |
| Validation message | Text | "Please select at least one day to continue" (red, shown when 0 selected) |
| Build My Strategy | Primary button | CTA with ArrowRight icon |
| Stats row | 3 cards | Events (463), Exhibitors (715), Heavy Hitters (31) |
| Explore section | Section | "Explore the Summit" — 6 featured heavy-hitter event cards |
| View All Events | Link/button | Secondary CTA |
| Footer note | Text | "Free. No signup required. Takes 30 seconds." |

### Actions & Navigation

| Action | Trigger | Result |
|--------|---------|--------|
| Select/deselect day | Click date button | Toggles date in selection |
| Build My Strategy | Click primary button | **Navigate to** `/quiz?dates=2026-02-16,2026-02-17,...` (only if ≥1 day selected) |
| View All Events | Click link | **Navigate to** `/explore` |

### Data

- Date selection stored in state; passed as URL query param to quiz.
- Featured events: first 6 heavy hitters from `events.json`.

---

## 2. Quiz Page (`/quiz?dates=...`)

### Entry

- Reached from Landing via "Build My Strategy" with `dates` in URL.
- If no `dates` param: **redirect to** `/`.

### Elements

| Element | Type | Description |
|--------|------|-------------|
| Back | Link | "← Back" — returns to previous page |
| Title | H1 | "Build Your Strategy" |
| Subtitle | Text | "{n} day(s) selected \| Feb 16, Feb 17, ..." |
| Tabs | Tab bar | "Quick Quiz" | "LinkedIn Profile" |
| Step indicator | Dots | 3 steps, current/completed/pending |
| Step 1 content | Card grid | 6 role cards (single-select) |
| Step 2 content | Pill buttons | 6 interest pills (multi-select, max 3) |
| Step 3 content | Pill buttons | 5 mission pills (multi-select, max 2) |
| Back button | Ghost button | "← Back" (visible from step 2+) |
| Next / Generate | Primary button | "Next" (steps 1–2) or "Generate My Strategy" (step 3) |

**LinkedIn Profile tab**

| Element | Type | Description |
|--------|------|-------------|
| Title | H2 | "Tell us about yourself" |
| Subtitle | Text | "Paste your LinkedIn profile details and we'll build a personalized strategy" |
| Textarea | Input | Placeholder, max 3000 chars, character counter |
| Generate My Strategy | Primary button | Sparkles icon |
| Note | Text | "Minimum 20 characters. Your data is not stored permanently." |

### Role Options (Step 1)

- Founder / CXO  
- Investor / VC  
- Product Leader  
- Engineer / Researcher  
- Policy / Government  
- Student / Academic  

### Interest Options (Step 2, max 3)

- LLMs & GenAI  
- Compute, Cloud & Infra  
- Ethics, Safety & Governance  
- Startups & Venture Capital  
- Enterprise Adoption  
- Social Impact (Agri, Health, Edu)  

### Mission Options (Step 3, max 2)

- Finding Talent / Hiring  
- Fundraising / Meeting VCs  
- Finding Customers / Sales  
- Deep Learning / Upskilling  
- Networking / Serendipity  

### Actions & Navigation

| Action | Trigger | Result |
|--------|---------|--------|
| Back | Click "Back" | `router.back()` → usually `/` |
| Select role | Click role card | Single-select for Step 1 |
| Select interest | Click pill | Toggle (max 3) |
| Select mission | Click pill | Toggle (max 2) |
| Next | Click "Next" | Advance to next step |
| Back (step) | Click "← Back" | Go to previous step |
| Generate My Strategy (Quiz) | Click (step 3) | Save to localStorage, **navigate to** `/loading` |
| Generate My Strategy (Profile) | Click | Same if text ≥ 20 chars |

### Data Flow

- Quiz answers + dates saved to `localStorage` before navigation.
- Profile mode: uses default founder profile for now (LLM extraction not yet implemented).

---

## 3. Loading Page (`/loading`)

### Elements

| Element | Type | Description |
|--------|------|-------------|
| Terminal window | Card | Title bar with traffic light dots, "AI Summit Strategist v1.0" |
| Terminal body | Scroll area | Lines appear one by one |
| Progress bar | Bar | Fills as lines complete |
| Status text | Text | "Building your personalized strategy" → "Redirecting to your strategy..." |

### Terminal Lines (in order)

1. `> Initializing AI Summit Strategist...`  
2. `> Loading profile data...`  
3. `> Scanning 463 events across 5 days...`  
4. `> Identifying 31 heavy hitter sessions...`  
5. `> Matching keywords and personas...`  
6. `> Calculating networking ROI scores...`  
7. `> Resolving time conflicts...`  
8. `> Selecting top recommendations...`  
9. `> Generating your strategy...`  
10. `✓ Strategy complete! Redirecting...`  

### Actions & Navigation

| Action | Trigger | Result |
|--------|---------|--------|
| Auto-redirect | Animation + scoring done | **Navigate to** `/plan/local` |

### Data Flow

- Reads `quizAnswers` and `selectedDates` from `localStorage`.
- Runs scoring engine; writes `planResult` to `localStorage`.
- If no data: **redirect to** `/`.

---

## 4. Plan Page (`/plan/local` or `/plan/[id]`)

### Entry

- Reached from Loading after strategy generation.
- Reads plan from `localStorage` if `id === 'local'`.
- If no plan: **redirect to** `/`.

### Elements

| Element | Type | Description |
|--------|------|-------------|
| Start Over | Link | "← Start Over" |
| Share Plan | Button | Copies current URL to clipboard |
| Summit badge | Pill | "India AI Impact Summit 2026" |
| Headline | H1 (gradient) | Dynamic: `plan.headline` |
| Strategy note | Paragraph | `plan.strategyNote` |
| Stats row | Inline | Events count, days count, exhibitors count |
| Date headers | Section | One per day: date, event count |
| Event cards | Cards | Per event (see Event Card below) |
| Exhibitors section | Section | "Exhibitors to Visit" — horizontal scroll / grid |
| Footer | Text | "Generated by AI Summit Strategist" |
| Build a new strategy | Link | Same as Start Over |
| Toast | Overlay | "Link copied to clipboard" (2s) |

### Event Card (per event)

| Element | Description |
|--------|-------------|
| Tier badge | Must Attend / Should Attend / Nice to Have / Wildcard |
| Heavy Hitter badge | If applicable |
| Score badge | "Score: {n}" |
| Title | Event title |
| Meta row | Time, venue, room |
| Tech depth | 1–5 dots |
| One-liner | Summary in blue callout |
| Speakers | Semicolon-separated |
| Knowledge partners | If present |
| Logo URLs | Partner logos |
| Networking Intel (accordion) | Score breakdown, icebreaker, strategy, decision makers, investors |
| Conflict warning | If time conflict: alternative event |

### Exhibitor Card (per exhibitor)

| Element | Description |
|--------|-------------|
| Logo or initial | Fallback if no logo |
| Name | Exhibitor name |
| One-liner | Short description |
| Score badge | K / P breakdown |
| Networking tip | Revealed on hover/click |

### Actions & Navigation

| Action | Trigger | Result |
|--------|---------|--------|
| Start Over | Click "Start Over" or "Build a new strategy" | **Navigate to** `/` |
| Share Plan | Click "Share Plan" | Copy URL to clipboard, show toast |

### Final Output

**What the user gets**

- A **personalized schedule** of 10–12 events across their selected days.
- Events grouped by date, ordered by time.
- Each event shows:
  - Tier (Must Attend / Should Attend / Nice to Have / Wildcard)
  - Score
  - Time, venue, room
  - One-liner
  - Speakers
  - Networking intel (icebreaker, strategy, score breakdown)
  - Conflict fallback if two events overlap
- **Exhibitors** (if any): top exhibitors to visit based on profile.
- **Shareable URL**: `/plan/local` (current) or future `/plan/[uuid]` for saved plans.

---

## 5. Explore Page (`/explore`)

### Entry

- Reached from Landing via "View All Events".
- No quiz or strategy required.

### Elements

| Element | Type | Description |
|--------|------|-------------|
| Home | Link | "← Home" |
| Title | H1 | "Explore Events" |
| Event count | Text | "{filtered} of {total} events" |
| Search bar | Input | "Search events, speakers, topics..." |
| Filters | Button | Toggle filter panel, shows active count badge |
| Filter panel | Collapsible | Date, Topics, Venue, Technical Depth, Heavy Hitters Only |
| Event list | Cards | Collapsible event cards |
| Clear Filters | Button | Shown when any filter active |

### Event Card (collapsed)

- Title  
- Date, time, venue  
- Heavy Hitter badge (if applicable)  
- Tech depth indicator  
- Expand chevron  

### Event Card (expanded)

- One-liner callout  
- Description  
- Speakers  
- Knowledge partners  
- Keywords  
- Networking signals (decision makers, investors)  
- Icebreaker  
- Strategy tip  

### Actions & Navigation

| Action | Trigger | Result |
|--------|---------|--------|
| Home | Click "Home" | **Navigate to** `/` |
| Search | Type in search bar | Filters events by text match |
| Toggle filters | Click "Filters" | Show/hide filter panel |
| Apply filter | Click date/topic/venue/depth/heavy hitter | Update filter state |
| Clear Filters | Click | Reset all filters |
| Expand event | Click card | Toggle expanded view |

---

## Flow Diagram (Text)

```
[Landing /]
    │
    ├── "Build My Strategy" (dates selected) ──► [Quiz /quiz?dates=...]
    │                                                    │
    │                                                    ├── "Generate My Strategy" ──► [Loading /loading]
    │                                                    │                                    │
    └── "View All Events" ─────────────────────────────► [Explore /explore]                    │
                                                                   │                          │
                                                                   └── "Home" ──► [Landing]    │
                                                                                               │
                                                                                               ▼
                                                                                    [Plan /plan/local]
                                                                                               │
                                                                                               ├── "Start Over" ──► [Landing]
                                                                                               └── "Share" ──► Copy URL
```

---

## Data Stored (localStorage)

| Key | Written By | Read By |
|-----|------------|---------|
| `quizAnswers` | Quiz page | Loading page |
| `selectedDates` | Quiz page | Loading page |
| `planResult` | Loading page | Plan page |
