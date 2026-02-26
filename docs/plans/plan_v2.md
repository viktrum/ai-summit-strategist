# AI Summit Strategist - Implementation Plan v2
**Updated with Heavy Hitter Selection Flow**

## Build Timeline: 4.5 Hours Remaining
(1 hour spent on data enrichment + planning + heavy hitter fix)

**Key Changes from v1**:
- ✅ Added Heavy Hitter Selection screen (NEW)
- ✅ Three-stage recommendation flow (was two-stage)
- ✅ Updated data: 463 events (was 480), 31 heavy hitters (6.7%)
- ✅ New Edge Function: `get-heavy-hitters`
- ⏱️ Additional 1 hour added to timeline

---

## Phase 1: Database Setup (30 minutes)

### Task 1.1: Data Cleaning ✅ COMPLETED
**Status**: Dedupe script already run
**Result**:
- Original: 480 sessions
- Clean: 463 sessions (removed 17 duplicates)
- Heavy hitters: 31 unique VIPs (6.7% of all events)
- Files: `sessions_enriched_clean.json` (use this), `sessions_enriched_backup.json` (backup)

**Next**: Import `sessions_enriched_clean.json` to Supabase

### Task 1.2: Create Supabase Schema (10 minutes)
**Location**: Supabase SQL Editor

**SQL**:
```sql
-- Create events table
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

  -- Rich DNA fields
  summary_one_liner text,
  technical_depth int CHECK (technical_depth BETWEEN 1 AND 5),
  target_personas text[],
  networking_signals jsonb,
  keywords text[],

  created_at timestamptz DEFAULT now()
);

-- Create user plans table
CREATE TABLE public.user_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile jsonb NOT NULL,
  recommended_schedule jsonb NOT NULL,
  selected_heavy_hitters jsonb,  -- NEW: Store user's HH selections
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Public read policies (for hackathon speed)
CREATE POLICY "Allow public read on events"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on plans"
  ON public.user_plans FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read on plans"
  ON public.user_plans FOR SELECT
  USING (true);

-- Create indexes
CREATE INDEX idx_events_date ON public.events(date);
CREATE INDEX idx_events_technical_depth ON public.events(technical_depth);
CREATE INDEX idx_events_keywords ON public.events USING GIN(keywords);
CREATE INDEX idx_networking_signals ON public.events USING GIN(networking_signals);
CREATE INDEX idx_heavy_hitters ON public.events((networking_signals->>'is_heavy_hitter'));
```

### Task 1.3: Import Data (5 minutes)
**Location**: Supabase Table Editor

**Actions**:
1. Go to Supabase Dashboard → Table Editor → events table
2. Click "Insert" → "Import data from CSV/JSON"
3. Upload `sessions_enriched_clean.json`
4. Verify column mapping (should auto-detect)
5. Import
6. **Verify**: Run `SELECT COUNT(*) FROM events;` → Should return **463**
7. **Verify HH**: Run `SELECT COUNT(*) FROM events WHERE (networking_signals->>'is_heavy_hitter')::boolean = true;` → Should return **31**

### Task 1.4: Create RPC Functions (10 minutes)
**Location**: Supabase SQL Editor

**SQL**:
```sql
-- Function 1: Get heavy hitters for selected dates
CREATE OR REPLACE FUNCTION get_heavy_hitters(
  user_dates date[]
)
RETURNS TABLE (
  event_id text,
  id int,
  title text,
  date date,
  start_time time,
  venue text,
  room text,
  speakers text,
  summary_one_liner text,
  networking_signals jsonb
)
LANGUAGE sql
AS $$
  SELECT
    event_id, id, title, date, start_time, venue, room, speakers,
    summary_one_liner, networking_signals
  FROM public.events
  WHERE
    date = ANY(user_dates)
    AND (networking_signals->>'is_heavy_hitter')::boolean = true
  ORDER BY date, start_time;
$$;

-- Function 2: Get domain-matched candidates (excluding selected HH)
CREATE OR REPLACE FUNCTION get_candidate_events(
  user_tech_level int,
  user_keywords text[],
  user_dates date[],
  selected_hh_ids text[] DEFAULT ARRAY[]::text[]
)
RETURNS TABLE (
  event_id text,
  id int,
  title text,
  date date,
  start_time time,
  venue text,
  room text,
  speakers text,
  summary_one_liner text,
  technical_depth int,
  target_personas text[],
  networking_signals jsonb,
  keywords text[]
)
LANGUAGE sql
AS $$
  SELECT
    event_id, id, title, date, start_time, venue, room, speakers,
    summary_one_liner, technical_depth, target_personas,
    networking_signals, keywords
  FROM public.events
  WHERE
    -- Date filter
    date = ANY(user_dates)
    AND
    -- Exclude already-selected heavy hitters
    event_id != ALL(selected_hh_ids)
    AND
    -- Technical depth fit (±1 buffer)
    technical_depth BETWEEN (user_tech_level - 1) AND (user_tech_level + 1)
    AND
    -- Keyword match
    keywords && user_keywords
  ORDER BY date, start_time
  LIMIT 25;
$$;

-- Test queries
SELECT * FROM get_heavy_hitters(ARRAY['2026-02-19'::date, '2026-02-20'::date]);
SELECT * FROM get_candidate_events(3, ARRAY['generative AI', 'startups'], ARRAY['2026-02-16'::date], ARRAY[]::text[]);
```

---

## Phase 2: Lovable UI Skeleton (60 minutes)

### Task 2.1: Initialize Lovable Project (5 minutes)
**Location**: Lovable.dev

**Actions**:
1. Create new project: "AI Summit Strategist"
2. Connect to Supabase (use connection string from dashboard)
3. Install dependencies: `@anthropic-ai/sdk`, `date-fns`, `lucide-react`

### Task 2.2: Create Type Definitions (5 minutes)
**File**: `src/types/index.ts`

```typescript
export interface Event {
  event_id: string;
  id: number;
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time?: string;
  venue: string;
  room?: string;
  speakers: string;
  knowledge_partners?: string;
  session_type?: string;
  summary_one_liner: string;
  technical_depth: number;
  target_personas: string[];
  networking_signals: {
    is_heavy_hitter: boolean;
    decision_maker_density: 'High' | 'Medium' | 'Low';
    investor_presence: 'Likely' | 'Unlikely';
  };
  keywords: string[];
}

export interface UserProfile {
  role?: string;
  interests?: string[];
  goals?: string[];
  technical_level?: number;
  keywords?: string[];
  raw_text?: string;
}

export interface ScheduleEvent {
  event_id: string;
  date: string;
  start_time: string;
  tier: 'Must Attend' | 'Should Attend' | 'Nice to Have' | 'Wildcard';
  networking_roi_score: number;
  match_reasoning: {
    why: string;
    halo_effect: boolean;
  };
  networking_tactics: {
    target_speaker: string;
    icebreaker: string;
    strategy: string;
  };
  conflict_fallback?: {
    has_conflict: boolean;
    fallback_event_id?: string;
  };
}

export interface UserPlan {
  plan_summary: {
    headline: string;
    strategy_note: string;
  };
  schedule: ScheduleEvent[];
}
```

### Task 2.3: Landing Page Component (15 minutes)
**File**: `src/pages/Landing.tsx`

**Features**:
- Hero section: "Don't Waste Your Time at the India AI Summit"
- Sub-headline: "Get a personalized, high-ROI networking strategy in 60 seconds"
- **Date selector**: Multi-select toggles for Feb 16-20
- CTA button: "Build My Strategy" → Opens Input Modal

**Design**:
- Dark theme (deep blue/black background)
- White text, blue accent colors
- Mobile-first responsive grid
- Use Shadcn Button, Badge, Card components

**Key Note**: Date selection is CRITICAL - determines which heavy hitters user sees

### Task 2.4: Input Modal Component (20 minutes)
**File**: `src/components/InputModal.tsx`

**Features**:
- Two tabs: "I'm Feeling Lucky" (Quiz) and "Paste Profile"
- **Quiz Tab**:
  - Question 1: Radio buttons (6 roles)
  - Question 2: Multi-select chips (6 interests, max 3)
  - Question 3: Multi-select chips (5 goals, max 2)
  - **Submit button text**: "See VIP Sessions" (NOT "Generate Agenda")
- **Paste Profile Tab**:
  - Large textarea
  - Character counter
  - **Submit button**: "See VIP Sessions"

**Design**:
- Shadcn Tabs, RadioGroup, Checkbox components
- Validation: Prevent submit if quiz incomplete
- Store selections in React state

**Flow**: On submit → Call `quizToProfile()` → Fetch heavy hitters → Show HeavyHitterSelector

### Task 2.5: Heavy Hitter Selection Screen (NEW - 20 minutes)
**File**: `src/components/HeavyHitterSelector.tsx`

**Critical Component**: This is the key differentiator

**Features**:
- Triggered after quiz/profile submission
- Shows up to 31 heavy hitter events (based on selected dates)
- **Header**: "First, pick your must-attend VIP sessions"
- **Subheader**: "We recommend 4-5 to leave room for other sessions"
- Grid of compact event cards with checkboxes
- Submit: "Generate My Full Schedule"

**Event Card Layout**:
```
┌────────────────────────────────────┐
│ ☐  🔥 VIP Keynote                 │
│                                    │
│ Bill Gates                         │
│ Chair, Gates Foundation            │
│                                    │
│ Wed, Feb 19 at 11:50 AM            │
│ Plenary Hall, Bharat Mandapam      │
│                                    │
│ "Tech philanthropy meets AI..."    │
└────────────────────────────────────┘
```

**Validation**:
- Minimum: 0 allowed (but show warning: "Consider picking at least 1 VIP")
- Maximum: 5 (hard cap or strong warning at 6+)
- Show counter: "3 / 5 selected"
- Disable submit if too many selected

**State Management**:
```typescript
const [selectedHHIds, setSelectedHHIds] = useState<string[]>([]);
const [heavyHitters, setHeavyHitters] = useState<Event[]>([]);

// On submit
const handleGenerate = async () => {
  const { plan_id, plan } = await generatePlan(
    profile,
    selectedDates,
    selectedHHIds  // Pass selected VIP IDs
  );
  navigate(`/plan/${plan_id}`);
};
```

**Design Notes**:
- Use checkbox, NOT radio (multi-select)
- Badge: "🔥 VIP Keynote" (red) or "⭐ VIP Panel" (gold)
- Highlight speakers' names in bold
- Show date/time prominently (users need to check for conflicts)
- Mobile: Stack cards vertically, desktop: 2-column grid

### Task 2.6: Mock Data for Development (5 minutes)
**File**: `src/lib/mockData.ts`

```typescript
import { Event } from '@/types';

export const mockHeavyHitters: Event[] = [
  {
    event_id: "mock-hh-1",
    id: 4472,
    title: "Keynote Session: Bill Gates",
    date: "2026-02-19",
    start_time: "11:50:00",
    venue: "Bharat Mandapam",
    room: "L3 Plenary Hall",
    speakers: "Bill Gates",
    summary_one_liner: "Tech philanthropy meets AI: lessons from global health",
    technical_depth: 2,
    target_personas: ["C-Suite Executives", "Impact Investors"],
    networking_signals: {
      is_heavy_hitter: true,
      decision_maker_density: "High",
      investor_presence: "Likely"
    },
    keywords: ["philanthropy", "global health", "AI ethics"]
  },
  // Add 4-5 more diverse examples
];
```

---

## Phase 3: Backend Logic (90 minutes)

### Task 3.1: Quiz Mapper Utility (10 minutes)
**File**: `src/lib/quizMapper.ts`

```typescript
export function quizToProfile(quiz: {
  role: string;
  interests: string[];
  goals: string[];
}) {
  const roleMap = {
    'Founder / CXO': { tech_level: 2, seniority: 'CXO', is_technical: false },
    'Investor / VC': { tech_level: 2, seniority: 'High', is_technical: false },
    'Product Leader': { tech_level: 3, seniority: 'Manager', is_technical: false },
    'Engineer / Researcher': { tech_level: 4, seniority: 'IC', is_technical: true },
    'Policy / Government': { tech_level: 1, seniority: 'High', is_technical: false },
    'Student / Academic': { tech_level: 3, seniority: 'Entry', is_technical: true },
  };

  const interestKeywords = {
    'LLMs & GenAI': ['generative AI', 'LLMs', 'foundation models'],
    'Compute, Cloud & Infra': ['AI infrastructure', 'cloud computing', 'hardware'],
    'Ethics, Safety & Governance': ['AI governance', 'ethical AI', 'AI safety'],
    'Startups & Venture Capital': ['startups', 'venture capital', 'entrepreneurship'],
    'Enterprise Adoption': ['enterprise AI', 'AI adoption', 'digital transformation'],
    'Social Impact': ['social impact', 'Global South', 'inclusive AI'],
  };

  const goalKeywords = {
    'Finding Talent / Hiring': ['talent', 'hiring', 'workforce'],
    'Fundraising / Meeting VCs': ['venture capital', 'investors', 'funding'],
    'Finding Customers / Sales': ['enterprise', 'sales', 'B2B'],
    'Deep Learning / Upskilling': ['learning', 'education', 'training'],
    'Networking / Serendipity': ['networking', 'collaboration'],
  };

  const roleConfig = roleMap[quiz.role];
  const keywords = [
    ...quiz.interests.flatMap(i => interestKeywords[i] || []),
    ...quiz.goals.flatMap(g => goalKeywords[g] || []),
  ];

  return {
    role: quiz.role,
    technical_level: roleConfig.tech_level,
    keywords: Array.from(new Set(keywords)), // Dedupe
    profile_text: `${quiz.role} interested in ${quiz.interests.join(', ')} for ${quiz.goals.join(', ')}`,
  };
}
```

### Task 3.2: Supabase Edge Functions (60 minutes)
**Location**: Supabase Dashboard → Edge Functions

#### **Function 1: `get-heavy-hitters`** (20 minutes)
**File**: `supabase/functions/get-heavy-hitters/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    const { dates } = await req.json();

    // Get all heavy hitters for selected dates
    const { data: heavyHitters, error } = await supabase.rpc('get_heavy_hitters', {
      user_dates: dates
    });

    if (error) throw error;

    return new Response(JSON.stringify({ heavyHitters }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

#### **Function 2: `generate-plan`** (40 minutes)
**File**: `supabase/functions/generate-plan/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

const SYSTEM_PROMPT = `You are an elite networking strategist for the India AI Impact Summit.

Your job: Given user-selected VIP sessions and domain-matched candidates, pick the best 5-7 additional events and write personalized icebreakers for ALL events (including VIPs).

Output ONLY valid JSON with this schema:
{
  "plan_summary": {
    "headline": "The [Role] Track",
    "strategy_note": "2-3 sentences on overall approach"
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
      }
    }
  ]
}

CRITICAL RULES:
- Include ALL user-selected VIP sessions in final output (mark as "Must Attend")
- Pick 5-7 best from candidate events (total final schedule: 10-12 events)
- Write specific icebreakers for ALL events (not just candidates)
- Recommend max 4-5 events per day
- For VIPs, explain WHO to approach and HOW
- Be specific: "Approach Mohit Jain after his talk" not "Attend this AI session"`;

serve(async (req) => {
  try {
    const { profile, dates, selected_heavy_hitter_ids } = await req.json();

    // Step 1: Get domain-matched candidates (excluding selected HH)
    const { data: candidates, error: candError } = await supabase.rpc('get_candidate_events', {
      user_tech_level: profile.technical_level,
      user_keywords: profile.keywords,
      user_dates: dates,
      selected_hh_ids: selected_heavy_hitter_ids,
    });

    if (candError) throw candError;

    // Step 2: Get full details of selected heavy hitters
    const { data: selectedHH, error: hhError } = await supabase
      .from('events')
      .select('*')
      .in('event_id', selected_heavy_hitter_ids);

    if (hhError) throw hhError;

    // Step 3: Call Claude for personalization
    const prompt = `User Profile: ${JSON.stringify(profile)}

User-Selected VIP Sessions (MUST include ALL in final plan):
${JSON.stringify(selectedHH, null, 2)}

Domain-Matched Candidate Events (pick best 5-7):
${JSON.stringify(candidates, null, 2)}

Generate personalized plan with icebreakers for ALL events.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const plan = JSON.parse(message.content[0].text);

    // Step 4: Save to database
    const { data: savedPlan, error: saveError } = await supabase
      .from('user_plans')
      .insert({
        user_profile: profile,
        recommended_schedule: plan,
        selected_heavy_hitters: selectedHH,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify({
      plan_id: savedPlan.id,
      plan: plan
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

**Deploy**:
```bash
supabase functions deploy get-heavy-hitters
supabase functions deploy generate-plan
```

**Set Secrets**:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-...
```

### Task 3.3: Frontend API Integration (20 minutes)
**File**: `src/lib/api.ts`

```typescript
import { supabase } from './supabase';
import { UserProfile, UserPlan, Event } from '@/types';

export async function getHeavyHitters(dates: string[]): Promise<Event[]> {
  const { data, error } = await supabase.functions.invoke('get-heavy-hitters', {
    body: { dates },
  });

  if (error) throw error;
  return data.heavyHitters;
}

export async function generatePlan(
  profile: UserProfile,
  dates: string[],
  selectedHeavyHitterIds: string[]
): Promise<{ plan_id: string; plan: UserPlan }> {
  const { data, error } = await supabase.functions.invoke('generate-plan', {
    body: {
      profile,
      dates,
      selected_heavy_hitter_ids: selectedHeavyHitterIds
    },
  });

  if (error) throw error;
  return data;
}

export async function getPlan(planId: string): Promise<UserPlan> {
  const { data, error } = await supabase
    .from('user_plans')
    .select('recommended_schedule')
    .eq('id', planId)
    .single();

  if (error) throw error;
  return data.recommended_schedule;
}
```

---

## Phase 4: Results Page (45 minutes)

### Task 4.1: Loading State Component (10 minutes)
**File**: `src/components/LoadingState.tsx`

**Features**:
- Terminal-style animation with step progression
- **Two variants**:
  1. Heavy Hitter fetch: "Loading VIP sessions for your dates..."
  2. Full plan generation: "Analyzing Profile" → "Matching 463 Events" → "Writing Icebreakers" → "Finalizing Strategy"
- Estimated time: 2-4 seconds
- Use Shadcn Progress or custom animation

### Task 4.2: Event Card Component (20 minutes)
**File**: `src/components/EventCard.tsx`

**Props**: `event: ScheduleEvent & Event` (merged data)

**Layout**:
```
┌─────────────────────────────────────────┐
│ 🔥 VIP Keynote    Technical Level: 2   │
│ Must Attend                             │
├─────────────────────────────────────────┤
│ Bill Gates - Gates Foundation          │
│ 11:50 AM • Plenary Hall                │
├─────────────────────────────────────────┤
│ ✨ Why This Matters:                    │
│ Tech philanthropy meets AI: lessons...  │
├─────────────────────────────────────────┤
│ 🎯 Networking Intel (Expandable)        │
│   • Target: Bill Gates                  │
│   • Icebreaker: "Your work on..."      │
│   • Strategy: Arrive 15 min early...   │
└─────────────────────────────────────────┘
```

**Styling**:
- Tier-based border colors (green=Must, blue=Should, gray=Nice)
- Heavy hitter badge: 🔥 with red/gold background
- Collapsible networking section (Shadcn Collapsible)

### Task 4.3: Results Page Component (15 minutes)
**File**: `src/pages/Results.tsx`

**Features**:
- Extract `planId` from URL query params
- Fetch plan from Supabase on mount
- Display `plan_summary.headline` as page title
- Group events by date
- Render timeline with EventCard components
- Share button (copies URL to clipboard)

**Layout**:
```
┌─────────────────────────────────┐
│ The Founder Track         [📋] │ ← Share button
│ Focus on VIP networking...     │
├─────────────────────────────────┤
│ 📅 Wednesday, Feb 19            │
│   ├─ EventCard (11:50) VIP     │
│   ├─ EventCard (14:30)          │
│   └─ 💤 Buffer Time (16:00-17:00)│
├─────────────────────────────────┤
│ 📅 Thursday, Feb 20             │
│   ├─ EventCard (09:30) VIP     │
│   └─ ...                        │
└─────────────────────────────────┘
```

---

## Phase 5: Polish & Deploy (30 minutes)

### Task 5.1: Error Handling (10 minutes)
**Add to all components**:
- Loading states (Shadcn Skeleton)
- Error boundaries (try/catch + user-friendly messages)
- Empty states:
  - No heavy hitters for selected dates: "No VIP sessions on these dates. Try selecting Feb 19-20."
  - No domain matches: "Try broadening your interests"
  - Plan not found: "This plan doesn't exist or has expired"

### Task 5.2: Mobile Responsiveness Check (10 minutes)
**Test on**:
- iPhone SE (375px width)
- iPad (768px width)
- Desktop (1440px width)

**Fix**:
- Heavy hitter selection grid: 1 col mobile, 2 col desktop
- Event cards stack properly
- Date selector wraps gracefully
- Modal fits viewport on small screens

### Task 5.3: Copy Polish (5 minutes)
**Review and fix**:
- Button text: "See VIP Sessions" → "Generate My Full Schedule"
- Heavy hitter screen header clarity
- Loading message grammar
- Error message tone (friendly, not technical)

### Task 5.4: Deploy to Vercel/Netlify (5 minutes)
**Via Lovable**:
- Click "Deploy" button
- Connect to Vercel/Netlify
- Set environment variables:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
- Deploy

**Test**:
- Visit production URL
- Complete full flow: quiz → HH selection → loading → results
- Copy/paste shareable URL in incognito window

---

## Phase 6: Testing & Validation (Remaining Time)

### Task 6.1: End-to-End Test Cases

**Test 1: Full Happy Path**
1. Land on homepage
2. Select dates: Feb 19-20
3. Complete quiz: "Founder / CXO" + "LLMs & GenAI" + "Fundraising"
4. Click "See VIP Sessions"
5. **HH Screen**: Should show ~24 VIP events from the 31 total (Bill Gates, Sam Altman, Sundar Pichai, etc.)
6. Select 4 VIPs (including at least one keynote)
7. Click "Generate My Full Schedule"
8. Wait for loading (3-5 seconds)
9. Results page:
   - Should show 4 selected VIPs as "Must Attend"
   - Should show 5-7 domain-matched events
   - Total: 10-12 events
   - Icebreakers should be specific
   - VIP badge visible on heavy hitters

**Test 2: Edge Case - Select 0 Heavy Hitters**
1. Complete quiz
2. HH Screen: Don't select any VIPs
3. Should show warning: "Consider picking at least 1 VIP"
4. Allow to proceed anyway
5. Final plan should have 10-12 domain-matched events only

**Test 3: Edge Case - Select 7+ Heavy Hitters**
1. Complete quiz
2. HH Screen: Try to select 7 VIPs
3. Should prevent or warn: "We recommend 4-5 to leave room for other sessions"
4. Hard cap at 6 or just strong warning

**Test 4: Edge Case - Feb 16 Only (Low HH Day)**
1. Select only Feb 16
2. HH Screen: Should show ~2 VIP events
3. Still allow to proceed
4. Final plan fills with more domain-matched events

**Test 5: Shareable URL**
1. Complete flow, get to results page
2. Copy shareable URL
3. Open in new incognito tab
4. Verify: Plan loads instantly (no re-generation)
5. All event details visible

### Task 6.2: Data Quality Spot Check
**Random sample 5 events from results**:
- Are icebreakers specific (names, companies, context)?
- Do "Must Attend" tiers make sense for user profile?
- Is technical_depth appropriate for user role?
- Are VIP events marked with badge?

### Task 6.3: Performance Check
- HH fetch time: <1 second?
- Full plan generation: <5 seconds?
- Supabase query time: <500ms?
- Results page load: <2 seconds?

---

## Deployment Checklist

### Pre-Deploy
- [x] Deduplicated sessions_enriched.json (480 → 463 events, removed 17 duplicates)
- [x] Fixed heavy hitter flags (31 unique VIPs, 6.7% of all events)
- [ ] Imported clean data to Supabase
- [ ] Created both RPC functions (`get_heavy_hitters`, `get_candidate_events`)
- [ ] Deployed both Edge Functions
- [ ] Set Anthropic API key in Supabase secrets
- [ ] Tested RPC functions with sample queries

### Deploy
- [ ] Lovable project connected to Supabase
- [ ] Environment variables set
- [ ] Built and deployed to production
- [ ] Custom domain configured (optional)

### Post-Deploy
- [ ] Smoke test: Complete quiz → HH selection → results
- [ ] Verify shareable URLs work
- [ ] Check mobile responsiveness
- [ ] Monitor Edge Function logs for errors
- [ ] Share with 2-3 test users for feedback

---

## Known Issues & TODOs

### Data Quality
- [x] 31 heavy hitters (post-dedupe, 6.7% of 463 events) - verified count
- [ ] Some keynote speakers fields are empty (names only in titles)
- [ ] 57 events missing `session_type` classification

### UX Questions
- [ ] Should HH selection be mandatory or optional?
- [ ] What if user selects dates with 0 heavy hitters?
- [ ] Should we show conflict warning on HH selection screen?
- [ ] Allow users to go back and change HH selection after seeing plan?

### Technical Debt
- [ ] Profile extraction (Prompt A) not yet implemented for "Paste Profile" tab
- [ ] No calendar export (ICS file)
- [ ] No analytics tracking
- [ ] No error logging/monitoring

---

## Success Metrics

### Must Have:
- ✅ 31 heavy hitters visible when appropriate dates selected
- ✅ User can select 4-5 VIPs before generating full plan
- ✅ Final plan includes user-selected HH + domain-matched events
- ✅ No duplicate recommendations
- ✅ Icebreakers are specific (names, companies, context)
- ✅ Mobile responsive

### Nice to Have:
- Show "VIP Density" indicator per day
- "Why this VIP matters for you" hint on HH selection
- Allow users to skip HH selection
- Export to calendar
- Social share with preview image

---

## Timeline Summary

**Original Estimate**: 3.5 hours
**New Estimate**: 4.5 hours

**Breakdown**:
- Phase 1: Database Setup - 30 min (✅ 20 min done)
- Phase 2: UI Skeleton - 60 min (includes new HH selector)
- Phase 3: Backend Logic - 90 min (includes new Edge Function)
- Phase 4: Results Page - 45 min
- Phase 5: Polish & Deploy - 30 min
- Phase 6: Testing - Buffer time

**Critical Path**: Heavy Hitter Selector → Edge Function → Results rendering

---

## Next Immediate Steps

1. ✅ **DONE**: Run dedupe script
2. **NOW**: Create Supabase tables (Task 1.2)
3. **NOW**: Import `sessions_enriched_clean.json` (Task 1.3)
4. **NOW**: Create RPC functions (Task 1.4)
5. **THEN**: Start Lovable project (Task 2.1)

Good luck! 🚀
