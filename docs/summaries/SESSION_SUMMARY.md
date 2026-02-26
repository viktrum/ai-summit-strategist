# Session Summary - AI Summit Strategist Project

**Date**: February 12, 2026
**Status**: Planning complete, ready for implementation

---

## 📊 Current State

### Data Status: ✅ READY
- **Clean dataset**: 463 events (removed 17 duplicates from original 480)
- **Heavy hitters**: 31 VIP sessions (6.7% of all events)
- **Enrichment**: Complete with AI-generated metadata
  - technical_depth (1-5)
  - target_personas (array)
  - networking_signals (is_heavy_hitter, decision_maker_density, investor_presence)
  - keywords (array)
  - summary_one_liner

**Files**:
- ✅ `sessions_enriched_clean.json` - Production-ready (463 events)
- ✅ `sessions_enriched_backup_20260212_165401.json` - Original backup

### Heavy Hitters Distribution:
```
Feb 16: 2 VIPs   (Stuart Russell sessions)
Feb 17: 4 VIPs   (Yoshua Bengio, Vinod Khosla, OpenAI)
Feb 18: 1 VIP    (Brad Smith panel)
Feb 19: 11 VIPs  ⭐ VIP DAY (Bill Gates, Sam Altman, Sundar Pichai, Demis Hassabis, Yann LeCun, Rishi Sunak)
Feb 20: 13 VIPs  ⭐ CLOSING VIP DAY (Vinod Khosla keynote, Cristiano Amon, more)

Total: 31 heavy hitters
```

---

## 🎯 Product Vision: THREE Flows

### **CRITICAL CLARIFICATION** (Latest Discussion)

The product has **3 INDEPENDENT flows**, not 2:

### **Flow 1: LinkedIn Profile Mode** (AI Magic - Full Personalization)
**User Journey**:
1. User pastes LinkedIn profile URL or text
2. System uses LLM to extract profile (Prompt A: Profile Extractor)
3. Shows Heavy Hitter Selection screen (user picks 4-5 VIPs)
4. Generates personalized 10-12 event schedule with icebreakers
5. Shareable URL with plan

**Output**: Personalized plan saved to database

---

### **Flow 2: Quick Quiz Mode** (AI Lite - Simplified Personalization)
**User Journey**:
1. User doesn't have/want to share LinkedIn
2. Asks for: **Name** + 3 quiz questions
   - Q1: Role (Founder, Engineer, Investor, etc.)
   - Q2: Interests (pick 3 from 6 options)
   - Q3: Goals (pick 2 from 5 options)
3. Shows Heavy Hitter Selection screen (user picks 4-5 VIPs)
4. Generates personalized 10-12 event schedule with icebreakers
5. Shareable URL with plan

**Output**: Personalized plan saved to database

**Quiz Mapping**:
- Role → technical_level (1-5)
- Interests → keywords array
- Goals → keywords + influences recommendations

---

### **Flow 3: Explore Events** (Manual Discovery - NO PERSONALIZATION) ⭐ NEW CLARITY

**IMPORTANT**: This is NOT about generating a personalized list!

**What it IS**:
- A **filtering/browsing interface** for all 463 events
- User applies filters → sees results → explores → can change filters
- **No saved output**, **no personalization**, **no AI recommendations**
- Ephemeral browsing experience (like browsing Netflix without building a queue)

**What it is NOT**:
- ❌ NOT a personalized event selector
- ❌ NOT generating "Your Schedule"
- ❌ NOT saving recommendations
- ❌ Just browse, filter, explore, go back, re-filter

**User Journey**:
1. User clicks "Explore All Events"
2. Sees filtering UI with 463 events
3. Applies filters (time, topic, technical depth, heavy hitters, etc.)
4. Browses filtered results
5. Can change filters anytime (ephemeral state)
6. Can share individual event links (not a plan)

**Key Features**:
- **Time-based filters**: "Happening Now", "Next 2 Hours", "Today", "Tomorrow"
- **Standard filters**: Technical depth, keywords, heavy hitters only, venue
- **Innovative filtering UX**: Heat map calendar, tag clouds, multi-dimensional sliders
- **Live results**: Updates instantly as filters change (no "Apply" button)
- **No personalization**: Shows same events to everyone with same filters

---

## 🎨 Flow 3: Innovative Filtering UX Concepts

### Research-Backed Patterns:

#### **Option A: Heat Map Calendar Filter**
```
┌─────────────────────────────────────────┐
│ Browse by Time                          │
├─────────────────────────────────────────┤
│ Click any time block:                   │
│        09:00  11:00  13:00  15:00       │
│ Feb 19 [███] [████] [████] [███]       │
│           ↑ Click to filter             │
│                                         │
│ Color intensity = VIP density + volume  │
│                                         │
│ Results: 12 events @ 11:00 AM Feb 19   │
└─────────────────────────────────────────┘
```
**Inspired by**: GitHub contributions, Airbnb map view
**Build time**: 90-120 minutes

#### **Option B: Netflix-Style Rows (Horizontal Carousels)**
```
┌─────────────────────────────────────────┐
│ 🔥 Heavy Hitters (31)                   │
│ ┌────┐ ┌────┐ ┌────┐ scroll ───►       │
│                                         │
│ 🎓 Deep Tech Sessions (Level 4-5)       │
│ ┌────┐ ┌────┐ ┌────┐ scroll ───►       │
│                                         │
│ 📅 Happening Today                      │
│ 🌍 Global South Focus                   │
│ 🚀 For Founders                         │
└─────────────────────────────────────────┘
```
**Inspired by**: Netflix, Spotify
**Build time**: 45-60 minutes
**Note**: Pre-curated rows, not personalized

#### **Option C: Smart Filter Sidebar**
```
┌────────┬──────────────────────────────┐
│ Filters│ Results (463 events)         │
├────────┼──────────────────────────────┤
│ Time   │ [Event cards grid]           │
│ [Now]  │                              │
│ [+2hrs]│ Updates live as you          │
│        │ change filters ←─────        │
│ Depth  │                              │
│ 1━━●━5 │ No "Apply" button            │
│        │                              │
│ VIPs   │                              │
│ [✓]Only│                              │
│        │                              │
│ Topics │                              │
│ #GenAI │                              │
│ #Safety│                              │
└────────┴──────────────────────────────┘
```
**Inspired by**: Amazon, Airbnb filters
**Build time**: 60-90 minutes

#### **Option D: Tag Cloud / Visual Filters**
```
┌─────────────────────────────────────────┐
│ Click topics to filter:                 │
│                                         │
│   GenAI ×48      Governance ×40         │
│      AI Safety ×24   Policy ×30         │
│   Global South ×29   Startups ×21       │
│                                         │
│ Click multiple = AND logic              │
│ [GenAI] [AI Safety] active ──►          │
│                                         │
│ Showing: 12 events matching both        │
└─────────────────────────────────────────┘
```
**Inspired by**: Pinterest, Tag-based discovery
**Build time**: 45-60 minutes

---

## 🏗️ Technical Architecture

### Three-Stage Recommendation (Flows 1 & 2 Only)

**Stage 1: Heavy Hitter Selection**
- Query Supabase: Get all 31 HH for user's selected dates
- User picks 4-5 VIPs manually
- User-controlled, not AI-selected

**Stage 2: Domain-Matched Pre-Filter**
- Supabase RPC: `get_candidate_events(tech_level, keywords, dates, exclude_selected_hh_ids)`
- Returns top 25 candidates (excludes already-selected HH)
- Deterministic filtering (no AI)

**Stage 3: AI Personalization**
- Edge Function calls Claude 3.5 Haiku
- Inputs: User-selected HH + 25 candidates + profile
- Outputs: Final 10-12 events with icebreakers, networking tactics
- Saved to `user_plans` table with UUID

### Flow 3 Architecture (Simple)

**No backend complexity needed**:
- Frontend queries Supabase events table directly
- Filters applied client-side or via SQL WHERE clauses
- No AI, no Edge Functions, no personalization
- Just efficient database queries + good UI

---

## 📋 Implementation Plan

### Phase 1: Database Setup (30 min) ⏳
- [x] Dedupe data (DONE - 463 events)
- [ ] Create Supabase tables (`events`, `user_plans`)
- [ ] Import `sessions_enriched_clean.json`
- [ ] Create RPC functions:
  - `get_heavy_hitters(dates)` - for Flows 1 & 2
  - `get_candidate_events(tech_level, keywords, dates, exclude_ids)` - for Flows 1 & 2

### Phase 2: Frontend - Flows 1 & 2 (2.5 hours) ⏳
- Landing page with 3 flow options
- **Flow 1**: LinkedIn input → Profile extraction
- **Flow 2**: Quiz modal (3 questions + name)
- Heavy Hitter Selector component (shared by both)
- Loading states
- Results page (shareable URL)

### Phase 3: Backend - Flows 1 & 2 (90 min) ⏳
- Edge Function 1: `get-heavy-hitters`
- Edge Function 2: `generate-plan` (calls Claude API)
- Profile extraction logic (Prompt A)
- Quiz → Profile mapper

### Phase 4: Frontend - Flow 3 (60-90 min) ⏳
- Explore Events page (separate route)
- Filtering UI (pick one approach from concepts)
- Event cards with all metadata visible
- Live filter updates

### Phase 5: Polish & Deploy (30 min) ⏳
- Mobile responsive
- Error handling
- Deploy to Vercel/Netlify

**Total Estimated Time**: 5-6 hours

---

## 🔑 Key Design Decisions Made

### 1. Heavy Hitter Selection is User-Controlled
**Decision**: Show all 31 VIPs, let user pick 4-5 manually
**Rationale**:
- Everyone wants Bill Gates/Sam Altman - show them upfront
- User control > AI selection for VIPs
- Solves overlap problem (user chooses between competing VIPs)

### 2. Three Independent Flows (Not Nested)
**Decision**: Three separate entry points, not progressive fallback
**Rationale**:
- Users know what they want upfront
- Flow 3 serves different use case (browsers vs planners)
- Simpler UX than "if LinkedIn fails, try quiz, then explore"

### 3. Flow 3 Has NO Personalization
**Decision**: Pure filtering interface, no saved output
**Rationale**:
- Different user need: "I want to browse" vs "Build me a plan"
- Ephemeral state - can change mind, re-filter
- Simpler to build - no AI, no database writes
- Reduces decision fatigue through good filtering UI

### 4. Time-Relative Filters for Flow 3
**Decision**: Include "Happening Now", "Next 2 Hours" filters
**Rationale**:
- Conference day-of usage: "What's happening right now?"
- More useful than only topic/persona filters
- Creates urgency, reduces browsing time

### 5. Max 4-5 Events/Day Recommendation (Flows 1 & 2)
**Decision**: Final plans have 10-12 events across 5 days, max 4-5/day
**Rationale**:
- Leave 1-1.5 hours buffer for organic networking
- Prevents burnout
- Room for serendipity

---

## 💾 Database Schema

### `events` Table (463 rows)
```sql
CREATE TABLE public.events (
  event_id text PRIMARY KEY,
  id int,
  title text NOT NULL,
  description text,
  date date,
  start_time time,
  end_time time,
  venue text,
  room text,
  speakers text,
  knowledge_partners text,
  session_type text,

  -- Rich DNA (AI-enriched)
  summary_one_liner text,
  technical_depth int CHECK (technical_depth BETWEEN 1 AND 5),
  target_personas text[],
  networking_signals jsonb,
  keywords text[],

  created_at timestamptz DEFAULT now()
);
```

### `user_plans` Table
```sql
CREATE TABLE public.user_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile jsonb NOT NULL,
  recommended_schedule jsonb NOT NULL,
  selected_heavy_hitters jsonb,
  created_at timestamptz DEFAULT now()
);
```

---

## 🎨 UX Open Questions

### Flow 3 Filtering UI - Need to Decide:

1. **Primary filtering approach**:
   - [ ] Heat Map Calendar (visual, time-first)
   - [ ] Netflix Rows (curated, topic-first)
   - [ ] Smart Sidebar (traditional, comprehensive)
   - [ ] Tag Cloud (visual, topic-first)

2. **Layout**:
   - [ ] List view (dense, info-rich)
   - [ ] Grid cards (visual, scannable)
   - [ ] Timeline view (chronological)

3. **Filter behavior**:
   - [ ] Live updates (no Apply button)
   - [ ] Apply button (batch updates)

4. **Multi-select logic**:
   - [ ] AND (must match all selected filters)
   - [ ] OR (match any selected filter)
   - [ ] Hybrid (AND within category, OR across categories)

5. **Mobile experience**:
   - [ ] Bottom sheet filters
   - [ ] Hamburger menu filters
   - [ ] Sticky filter bar

**Current thinking**:
- Heat Map Calendar OR Netflix Rows (most innovative)
- Grid cards (balance of visual + info)
- Live updates (modern, responsive)
- AND within category (more precise)

---

## 📚 Files Reference

### Primary Documents:
- `CLAUDE.md` - Complete project context, architecture, technical details
- `plan_v2.md` - Detailed implementation plan with code snippets
- `HEAVY_HITTER_UPDATE.md` - Heavy hitter strategy, 3-stage flow
- `SESSION_SUMMARY.md` - This file (high-level overview)

### Data Files:
- `sessions_enriched_clean.json` - **USE THIS** (463 events, production-ready)
- `sessions_enriched_backup_20260212_165401.json` - Original backup
- `sessions_enriched.json` - Original (480 events, has duplicates)
- `sessions.json` - Raw scraped data
- `sessions.csv` - CSV export

### Scripts:
- `fetch_sessions.py` - Original scraper
- `dedupe_final.py` - Deduplication script (used 'id' field correctly)
- `fix_heavy_hitters.py` - Heavy hitter flag fixer

---

## ✅ Completed Work

1. ✅ Fetched 480 events from India AI Summit API
2. ✅ AI enrichment of all events (Claude 3.5 Haiku, $0.25 cost)
3. ✅ Fixed heavy hitter detection (31 VIPs identified correctly)
4. ✅ Deduplicated data (removed 17 true duplicates)
5. ✅ Clarified 3-flow product vision
6. ✅ Researched innovative filtering UX patterns
7. ✅ Updated all documentation with correct numbers

---

## 🚀 Next Actions

### Immediate (Before Building):
1. **Decide on Flow 3 filtering UI approach** (from 4 options above)
2. **Create Supabase project** and run schema SQL
3. **Import clean data** to Supabase
4. **Set up Lovable project** with Supabase connection

### Then Build (5-6 hours):
1. Database + RPC functions (30 min)
2. Flows 1 & 2 UI + backend (4 hours)
3. Flow 3 filtering UI (60-90 min)
4. Polish + deploy (30 min)

---

## 🎯 Success Metrics

### Must Have:
- ✅ 463 events imported to Supabase
- ✅ 31 heavy hitters flagged correctly
- ✅ Flow 1: LinkedIn → Personalized plan with icebreakers
- ✅ Flow 2: Quiz → Personalized plan with icebreakers
- ✅ Flow 3: Filter 463 events with innovative UI
- ✅ Shareable URLs for Flows 1 & 2
- ✅ Mobile responsive

### Nice to Have:
- Calendar export (ICS file)
- Social proof (X people interested)
- "Happening Now" real-time updates
- Event detail modal with full enrichment data

---

## 🤔 Context for Next Session

When you return:

1. **Data is ready**: Use `sessions_enriched_clean.json` (463 events, 31 HH)
2. **Three flows are distinct**: LinkedIn, Quiz, Explore (no personalization in Flow 3)
3. **Flow 3 needs decision**: Which filtering UI approach? (Heat Map, Netflix Rows, Smart Sidebar, or Tag Cloud)
4. **Build order**: Database → Flows 1&2 → Flow 3 → Polish
5. **Timeline**: 5-6 hours total estimated

**Key clarification made this session**: Flow 3 is NOT about personalization - it's pure filtering/browsing with no saved output. User can filter, explore, change filters anytime (ephemeral state).

---

**Last Updated**: February 12, 2026
**Ready to build**: Yes (pending Flow 3 UI decision)
