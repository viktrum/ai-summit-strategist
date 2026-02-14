# AI Summit Strategist - Implementation Plan

## Build Timeline: 3 Hours Remaining
(1 hour spent on data enrichment + planning)

---

## Phase 1: Database Setup (30 minutes)

### Task 1.1: Data Cleaning (10 minutes)
**Location**: Cursor (local)

**Actions**:
1. Open `sessions_enriched.json`
2. Deduplicate 17 duplicate event_ids:
   - IDs to check: 4638, 5140, 5145, 5159, 5169, 5172, 5190, 5195, 5200, 5207, 5380, 5398, 5418, 5440, 5446, 5460, 5527
   - Keep first occurrence, remove duplicate
3. Save as `sessions_enriched_clean.json`

**Script** (quick dedupe):
```javascript
const fs = require('fs');
const events = JSON.parse(fs.readFileSync('sessions_enriched.json'));
const seen = new Set();
const clean = events.filter(e => {
  if (seen.has(e.event_id)) return false;
  seen.add(e.event_id);
  return true;
});
console.log(`Removed ${events.length - clean.length} duplicates`);
fs.writeFileSync('sessions_enriched_clean.json', JSON.stringify(clean, null, 2));
```

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
```

### Task 1.3: Import Data (5 minutes)
**Location**: Supabase Table Editor

**Actions**:
1. Go to Supabase Dashboard → Table Editor → events table
2. Click "Insert" → "Import data from CSV"
3. Upload `sessions_enriched_clean.json`
4. Verify column mapping (should auto-detect)
5. Import
6. **Verify**: Run `SELECT COUNT(*) FROM events;` → Should return 463 (480 - 17 duplicates)

### Task 1.4: Create RPC Functions (5 minutes)
**Location**: Supabase SQL Editor

**SQL**:
```sql
-- Deterministic candidate filter
CREATE OR REPLACE FUNCTION get_candidate_events(
  user_tech_level int,
  user_keywords text[],
  user_dates date[],
  require_heavy_hitter boolean DEFAULT false
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
    -- Technical depth fit (±1 buffer)
    technical_depth BETWEEN (user_tech_level - 1) AND (user_tech_level + 1)
    AND
    -- Keyword or heavy hitter match
    (
      keywords && user_keywords  -- Array overlap
      OR
      (require_heavy_hitter AND (networking_signals->>'is_heavy_hitter')::boolean = true)
    )
  ORDER BY date, start_time
  LIMIT 30;
$$;

-- Test query
SELECT * FROM get_candidate_events(
  3,  -- technical_depth
  ARRAY['generative AI', 'startups', 'venture capital'],
  ARRAY['2026-02-16'::date, '2026-02-17'::date],
  true
);
```

---

## Phase 2: Lovable UI Skeleton (45 minutes)

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
- Hero section with headline
- Date selector (multi-select toggles for Feb 16-20)
- CTA button "Build My Strategy"
- Opens modal on click

**Design**:
- Dark theme (deep blue/black background)
- White text, blue accent colors
- Mobile-first responsive grid
- Use Shadcn Button, Badge, Card components

### Task 2.4: Input Modal Component (15 minutes)
**File**: `src/components/InputModal.tsx`

**Features**:
- Two tabs: "I'm Feeling Lucky" (Quiz) and "Paste Profile"
- **Quiz Tab**:
  - Question 1: Radio buttons (6 roles)
  - Question 2: Multi-select chips (6 interests, max 3)
  - Question 3: Multi-select chips (5 goals, max 2)
  - Submit button: "Generate Agenda"
- **Paste Profile Tab**:
  - Large textarea
  - Character counter
  - Submit button: "Analyze & Generate"

**Design**:
- Shadcn Tabs, RadioGroup, Checkbox components
- Validation: Prevent submit if quiz incomplete
- Store selections in React state

### Task 2.5: Mock Data for Development (5 minutes)
**File**: `src/lib/mockData.ts`

```typescript
import { Event } from '@/types';

export const mockEvents: Event[] = [
  {
    event_id: "6920c931b5d0f57ed6f77cdf",
    id: 5221,
    title: "Role of Contextual Norms in Designing Better AI Systems",
    date: "2026-02-16",
    start_time: "09:30:00",
    venue: "Bharat Mandapam",
    room: "L1 Meeting Room No. 17",
    speakers: "Mohit Jain, PhD; Philipp Zimmer",
    summary_one_liner: "Cultural norms are key to building AI people trust",
    technical_depth: 4,
    target_personas: ["NLP Researchers", "AI Ethics Researchers"],
    networking_signals: {
      is_heavy_hitter: false,
      decision_maker_density: "Medium",
      investor_presence: "Unlikely"
    },
    keywords: ["contextual norms", "cultural AI", "trust in AI"]
  },
  // Add 5-10 more diverse examples
];
```

---

## Phase 3: Backend Logic (60 minutes)

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
    technical_level: roleConfig.tech_level,
    keywords: Array.from(new Set(keywords)), // Dedupe
    require_heavy_hitter: quiz.goals.includes('Fundraising / Meeting VCs'),
    profile_text: `${quiz.role} interested in ${quiz.interests.join(', ')} for ${quiz.goals.join(', ')}`,
  };
}
```

### Task 3.2: Supabase Edge Function (30 minutes)
**Location**: Supabase Dashboard → Edge Functions

**Create Function**: `generate-plan`

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

serve(async (req) => {
  try {
    const { profile, dates } = await req.json();

    // Step 1: Get candidate events from DB
    const { data: candidates, error } = await supabase.rpc('get_candidate_events', {
      user_tech_level: profile.technical_level,
      user_keywords: profile.keywords,
      user_dates: dates,
      require_heavy_hitter: profile.require_heavy_hitter || false,
    });

    if (error) throw error;

    // Step 2: Call Claude for personalization
    const prompt = `User Profile: ${JSON.stringify(profile)}

Available Events: ${JSON.stringify(candidates)}

Select 10-12 best events, write icebreakers, assign tiers. Output valid JSON only.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system: `You are an elite networking strategist. [FULL SYSTEM PROMPT FROM CLAUDE.MD]`,
      messages: [{ role: 'user', content: prompt }],
    });

    const plan = JSON.parse(message.content[0].text);

    // Step 3: Save to database
    const { data: savedPlan, error: saveError } = await supabase
      .from('user_plans')
      .insert({
        user_profile: profile,
        recommended_schedule: plan,
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
import { UserProfile, UserPlan } from '@/types';

export async function generatePlan(
  profile: UserProfile,
  dates: string[]
): Promise<{ plan_id: string; plan: UserPlan }> {
  const { data, error } = await supabase.functions.invoke('generate-plan', {
    body: { profile, dates },
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
- Steps: "Analyzing Profile" → "Scanning 480 Events" → "Identifying Heavy Hitters" → "Calculating ROI" → "Finalizing Strategy"
- Estimated time: 3-5 seconds
- Use Shadcn Progress or custom animation

### Task 4.2: Event Card Component (20 minutes)
**File**: `src/components/EventCard.tsx`

**Props**: `event: ScheduleEvent & Event` (merged data)

**Layout**:
```
┌─────────────────────────────────────────┐
│ 🔥 Heavy Hitter    Technical Level: 4  │
│ Must Attend                             │
├─────────────────────────────────────────┤
│ Title (Bold, Large)                     │
│ 09:30 AM • Bharat Mandapam, Room 17    │
├─────────────────────────────────────────┤
│ ✨ Why This Matters:                    │
│ Cultural norms are key to...           │
├─────────────────────────────────────────┤
│ 🎯 Networking Intel (Expandable)        │
│   • Target: Mohit Jain, PhD            │
│   • Icebreaker: "I saw your work..."   │
│   • Strategy: Sit front left, arrive... │
└─────────────────────────────────────────┘
```

**Styling**:
- Tier-based border colors (green=Must, blue=Should, gray=Nice)
- Heavy hitter badge: flame icon + gold background
- Collapsible networking section (Shadcn Collapsible)

### Task 4.3: Results Page Component (15 minutes)
**File**: `src/pages/Results.tsx`

**Features**:
- Extract `planId` from URL query params
- Fetch plan from Supabase on mount
- Display plan_summary.headline as page title
- Group events by date
- Render timeline with EventCard components
- Share button (copies URL to clipboard)

**Layout**:
```
┌─────────────────────────────────┐
│ The Founder Track         [📋] │ ← Share button
│ Focus on high-ROI investor...  │
├─────────────────────────────────┤
│ 📅 Friday, Feb 16               │
│   ├─ EventCard (09:30)          │
│   ├─ EventCard (11:00)          │
│   └─ 💤 Buffer Time (14:00-15:30)│
├─────────────────────────────────┤
│ 📅 Saturday, Feb 17             │
│   ├─ EventCard (10:00)          │
│   └─ ...                        │
└─────────────────────────────────┘
```

---

## Phase 5: Polish & Deploy (30 minutes)

### Task 5.1: Error Handling (10 minutes)
**Add to all components**:
- Loading states (Shadcn Skeleton)
- Error boundaries (try/catch + user-friendly messages)
- Empty states (no events match, plan not found)

### Task 5.2: Mobile Responsiveness Check (10 minutes)
**Test on**:
- iPhone SE (375px width)
- iPad (768px width)
- Desktop (1440px width)

**Fix**:
- Event cards stack properly
- Date selector wraps on small screens
- Modal fits viewport

### Task 5.3: Copy Polish (5 minutes)
**Review and fix**:
- Typos in headlines
- CTA button text clarity
- Loading message grammar
- Error message tone (friendly, not technical)

### Task 5.4: Deploy to Vercel/Netlify (5 minutes)
**Via Lovable**:
- Click "Deploy" button
- Connect to Vercel/Netlify
- Set environment variables (Supabase URL, Anon Key)
- Deploy

**Test**:
- Visit production URL
- Complete full flow (quiz → loading → results)
- Copy/paste shareable URL in incognito window

---

## Phase 6: Testing & Validation (Remaining Time)

### Task 6.1: End-to-End Test Cases
1. **Quiz Flow**:
   - Select "Founder / CXO" + "LLMs & GenAI" + "Fundraising"
   - Select dates: Feb 16-17
   - Click "Generate Agenda"
   - Verify: Heavy hitters appear, icebreakers are specific

2. **Shareable URL**:
   - Copy plan URL
   - Open in new incognito tab
   - Verify: Plan loads instantly (no re-generation)

3. **Edge Cases**:
   - Select only 1 day → Should return 4-5 events
   - Select all interests → Should handle gracefully
   - Select "Student" role → Should get depth 3-4 events

### Task 6.2: Data Quality Spot Check
**Random sample 5 events**:
- Do icebreakers make sense?
- Are "Must Attend" tiers actually high ROI?
- Is technical_depth matching user role?

### Task 6.3: Performance Check
- Time from quiz submit to results: <5 seconds?
- Supabase query time: <500ms?
- LLM response time: <3 seconds?

---

## Deployment Checklist

### Pre-Deploy
- [ ] Deduplicated sessions_enriched.json (480 → 463 events)
- [ ] Imported clean data to Supabase
- [ ] Created RPC function `get_candidate_events`
- [ ] Deployed Edge Function `generate-plan`
- [ ] Set Anthropic API key in Supabase secrets
- [ ] Tested RPC function with sample query

### Deploy
- [ ] Lovable project connected to Supabase
- [ ] Environment variables set (SUPABASE_URL, SUPABASE_ANON_KEY)
- [ ] Built and deployed to production
- [ ] Custom domain configured (optional)

### Post-Deploy
- [ ] Smoke test: Complete quiz flow
- [ ] Verify shareable URLs work
- [ ] Check mobile responsiveness
- [ ] Monitor Edge Function logs for errors
- [ ] Share with 2-3 test users for feedback

---

## Backup Plan (If Running Out of Time)

### Cut Scope:
1. **"Paste Profile" mode** → Keep quiz-only
2. **Wildcard tier** → Only output Must/Should/Nice tiers
3. **Conflict fallback** → Show overlaps, don't suggest fallback
4. **Buffer time blocks** → Just recommend 4-5 events, user adds buffers mentally

### Mock AI (If Anthropic API Issues):
- Create `mockPlan.ts` with 3 pre-generated plans (Founder, Researcher, Policy)
- Map quiz answers → closest mock plan
- Still save to DB for shareable URLs

---

## Success Metrics

### MVP Complete When:
- ✅ User completes quiz in <30 seconds
- ✅ Plan generates in <5 seconds
- ✅ Results page is mobile-friendly
- ✅ Shareable URLs work
- ✅ At least 10 events have specific icebreakers

### Stretch Goals:
- Calendar export (ICS file download)
- "Why was this excluded?" section (show rejected events)
- Social share preview (Open Graph tags)
- Analytics (track which events most popular)

---

## Next Actions (Start Here)

1. **Right now**: Run dedupe script on `sessions_enriched.json`
2. **Supabase**: Create tables and RPC function (copy SQL from above)
3. **Lovable**: Start with Landing page component
4. **Test early**: Use mock data to build UI before connecting backend

---

## Questions During Build?

### If filtering returns 0 events:
- Check date format (should be YYYY-MM-DD)
- Verify keywords are lowercase in DB
- Test RPC function directly in SQL editor

### If AI output is weird:
- Check system prompt is complete (from CLAUDE.md)
- Verify JSON parsing (add try/catch)
- Test with Haiku directly in Anthropic console first

### If shareable URLs fail:
- Check RLS policies are enabled
- Verify plan_id is valid UUID
- Test query directly: `SELECT * FROM user_plans WHERE id = '...'`

---

## Time Allocation Summary

- ✅ Phase 1: Database Setup - 30 min
- ✅ Phase 2: UI Skeleton - 45 min
- ✅ Phase 3: Backend Logic - 60 min
- ✅ Phase 4: Results Page - 45 min
- ✅ Phase 5: Polish & Deploy - 30 min
- ✅ Phase 6: Testing - Remaining time

**Total**: ~3.5 hours + buffer

---

Good luck! 🚀
