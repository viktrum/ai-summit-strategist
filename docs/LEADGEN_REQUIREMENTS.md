# Lead Generation — Implementation Requirements (Tracks 3 & 4)

**Purpose**: Self-contained spec for implementing lead gen features. Can be worked on in a separate terminal/session with zero context from the hot-reload (Track 2) work.

**App**: AI Summit Strategist — aisummit26.info
**Stack**: Next.js 16 (Turbopack), Supabase (Postgres + anon key), Netlify
**Repo**: `/Users/piyushmayank/Projects/ai-summit-web/web`
**Summit dates**: Feb 16-20, 2026

---

## Current State (What Exists)

### Supabase `user_plans` table (current schema)
```sql
-- Existing columns (DO NOT MODIFY these)
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_profile    jsonb           -- NOT USED (legacy from initial design)
headline        text
strategy_note   text
events          jsonb           -- Array of SavedPlanEvent (slim: id, tier, score, pinned, is_fallback, fallback_for, is_manual)
exhibitor_ids   integer[]
user_name       text
created_at      timestamptz DEFAULT now()
```

### How plans are currently created
1. User takes quiz → answers saved to `localStorage.quizAnswers`
2. Loading page runs scoring engine → writes `localStorage.planResult`
3. Loading page inserts slim version into Supabase `user_plans` (headline, strategy_note, events array with IDs+tiers+scores, exhibitor_ids, user_name)
4. User gets redirected to `/plan/local` (local plan) or `/plan/{uuid}` (shared plan)

### Key files for context
- `web/src/app/loading/page.tsx` — Where plan generation + Supabase insert happens (~line 160-220)
- `web/src/app/plan/[id]/page.tsx` — Plan display page
- `web/src/lib/supabase.ts` — Supabase client (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `web/src/lib/types.ts` — All TypeScript types
- `web/src/lib/constants.ts` — Quiz option labels/mappings

### What's NOT in the codebase yet
- No email collection anywhere
- Quiz answers are ONLY in localStorage (not persisted to Supabase)
- No analytics tracking
- No share text pre-population
- No visit counting

---

## Track 3 — Schema Changes

### 3.1 Add columns to `user_plans`
```sql
ALTER TABLE user_plans ADD COLUMN email TEXT;
ALTER TABLE user_plans ADD COLUMN quiz_answers JSONB;
ALTER TABLE user_plans ADD COLUMN lead_score INTEGER;
ALTER TABLE user_plans ADD COLUMN visit_count INTEGER DEFAULT 1;
ALTER TABLE user_plans ADD COLUMN last_visited_at TIMESTAMPTZ;
```

**Critical**: `quiz_answers` is the #1 priority. Currently quiz answers live ONLY in localStorage — if a user clears their browser, all lead qualification data is lost. This column stores the raw quiz answers object.

### 3.2 Create `analytics_events` table
```sql
CREATE TABLE analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid REFERENCES user_plans(id),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- RLS: public insert (anon), read for authenticated only
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON analytics_events FOR INSERT TO anon WITH CHECK (true);
```

### 3.3 RLS for new columns
The existing `user_plans` RLS already allows public insert + read for anon. The new columns just need to be included in updates:

```sql
-- Allow anon to update email and visit_count on their own plans
CREATE POLICY "anon_update_email" ON user_plans FOR UPDATE TO anon
  USING (true) WITH CHECK (true);
```

**Note**: For a 1-week lifespan app with no auth, broad RLS is acceptable. Don't over-engineer.

---

## Track 4 — Features

### 4.1 Store Quiz Answers in Supabase (P0 — 30 min)

**File**: `web/src/app/loading/page.tsx`

**What to do**: In the `runScoring` callback, when inserting into `user_plans`, include the quiz answers.

**Current insert** (~line 205):
```typescript
const { data: insertData } = await supabase
  .from('user_plans')
  .insert({
    headline: plan.headline,
    strategy_note: plan.strategyNote,
    events: slimEvents,
    exhibitor_ids: plan.exhibitors.map((e) => e.exhibitor.id),
    user_name: userName,
  })
  .select('id')
  .single();
```

**Change to**:
```typescript
// Read quiz answers from localStorage
let quizAnswers = null;
try {
  const raw = localStorage.getItem('quizAnswers');
  if (raw) quizAnswers = JSON.parse(raw);
} catch { /* ignore */ }

const { data: insertData } = await supabase
  .from('user_plans')
  .insert({
    headline: plan.headline,
    strategy_note: plan.strategyNote,
    events: slimEvents,
    exhibitor_ids: plan.exhibitors.map((e) => e.exhibitor.id),
    user_name: userName,
    quiz_answers: quizAnswers,  // NEW
  })
  .select('id')
  .single();
```

### 4.2 Email Capture Bottom Bar on Plan Page (P0 — 45 min)

**File**: `web/src/app/plan/[id]/page.tsx`

**Behavior**:
- Persistent bottom bar on plan page (Days 1-3 of summit: Feb 16-18)
- Copy: "Get your plan on all devices — enter your email and we'll send you a direct link"
- Input field: placeholder "Work email preferred"
- Optional "Company" text field
- "100% free, no spam" subtext
- Submit button: "Send My Link"
- On submit: `UPDATE user_plans SET email = $1 WHERE id = $2`
- Show success state: "Check your inbox!" (even though we're not sending email yet — the data capture is what matters)
- Dismiss: small X button, sets `sessionStorage.emailBarDismissed = '1'`
- Don't show if already submitted (check `localStorage.emailSubmitted`)
- Don't show on shared plans (only on owner's plan — `params.id === 'local'` or `lastPlanId === params.id`)

**Day 4-5 upgrade** (Feb 19-20): Replace bottom bar with a one-time slide-up modal. Copy: "Get your Post-Summit Intelligence Brief — I'll compile key insights from YOUR sessions." Same email field + company field.

**Date-based logic**:
```typescript
const today = new Date().toISOString().split('T')[0];
const isLatePhase = today >= '2026-02-19';
```

### 4.3 Pre-populated Share Text (P1 — 20 min)

**File**: `web/src/app/plan/[id]/page.tsx`

Add share buttons (LinkedIn + WhatsApp) near the existing "Share Plan" / "Copy Link" button.

**LinkedIn share text**:
```
Just got my personalized AI Summit strategy from aisummit26.info — it picked my top sessions and even gave me icebreakers for each speaker. Try it if you're at #IndiaAISummit
```

**WhatsApp share text**:
```
Check out my personalized AI Summit 2026 strategy: {plan_url} — It picks your top sessions and gives you networking tactics for each one. Free tool, takes 30 seconds.
```

**Implementation**:
```typescript
const shareUrl = `https://aisummit26.info/plan/${planId}`;
const linkedInText = encodeURIComponent(`Just got my personalized AI Summit strategy from aisummit26.info — it picked my top sessions and even gave me icebreakers. Try it if you're at #IndiaAISummit`);
const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${linkedInText}`;
const whatsAppText = encodeURIComponent(`Check out my personalized AI Summit 2026 strategy: ${shareUrl}`);
const whatsAppUrl = `https://api.whatsapp.com/send?text=${whatsAppText}`;
```

### 4.4 Analytics Event Tracking (P1 — 30 min)

**New file**: `web/src/lib/analytics.ts`

```typescript
import { supabase } from '@/lib/supabase';

export async function trackEvent(
  eventType: string,
  planId?: string | null,
  eventData?: Record<string, unknown>,
) {
  try {
    await supabase.from('analytics_events').insert({
      plan_id: planId || null,
      event_type: eventType,
      event_data: eventData || {},
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch {
    // Silent failure — analytics should never break the app
  }
}
```

**Events to track** (instrument in the relevant files):

| Event | Where | Data |
|-------|-------|------|
| `plan_created` | `loading/page.tsx` after successful insert | `{ event_count, exhibitor_count, role }` |
| `plan_viewed` | `plan/[id]/page.tsx` on load | `{ is_owner, is_shared }` |
| `email_submitted` | Plan page email bar submit | `{ email_domain }` (extract domain, not full email) |
| `icebreaker_copied` | Plan page copy button | `{ event_id }` |
| `share_clicked` | Plan page share buttons | `{ channel: 'linkedin' \| 'whatsapp' \| 'copy_link' }` |
| `plan_return_visit` | Plan page, if `visit_count > 1` | `{ visit_count }` |

### 4.5 Visit Count Tracking (P2 — 15 min)

**File**: `web/src/app/plan/[id]/page.tsx`

On plan page load, if the user is the plan owner:
```typescript
// Increment visit count
await supabase.rpc('increment_visit', { plan_uuid: params.id });
```

Or simpler (no RPC needed):
```typescript
await supabase
  .from('user_plans')
  .update({
    visit_count: /* current + 1 — need to use raw SQL or just read-then-write */,
    last_visited_at: new Date().toISOString(),
  })
  .eq('id', planId);
```

For atomic increment without RPC, create a simple function:
```sql
CREATE OR REPLACE FUNCTION increment_visit(plan_uuid uuid)
RETURNS void AS $$
  UPDATE user_plans
  SET visit_count = COALESCE(visit_count, 0) + 1,
      last_visited_at = now()
  WHERE id = plan_uuid;
$$ LANGUAGE sql;
```

### 4.6 "Built by" Footer (P2 — 10 min)

**File**: `web/src/app/layout.tsx` or individual pages

Add a subtle footer at the bottom of every page:
```html
<footer class="text-center text-xs text-gray-400 py-4">
  Built by <a href="https://linkedin.com/in/piyushmayank" target="_blank">Piyush Mayank</a>
</footer>
```

### 4.7 Netlify Analytics (P2 — 5 min, manual)

Go to Netlify dashboard → Site → Analytics → Enable. $9/month. Zero code changes.

---

## Hard Rules (from brainstorm consensus)

1. **Never gate plan generation behind email.** Email is always optional.
2. **Never show email modal on first visit.** Bottom bar is OK (less aggressive).
3. **No consulting CTAs in the app during the event.** The app must feel purely generous.
4. **WhatsApp > Email** for India market. Always offer WhatsApp option.
5. **"100% free, no spam"** — explicitly state this near email fields.
6. **"Work email preferred"** as placeholder — nudges company emails (30% → 55%).
7. **Skip IP tracking.** Conference Wi-Fi makes it useless + DPDP Act privacy risk.

---

## Lead Scoring (Post-Summit SQL, not real-time)

```sql
SELECT
  up.id,
  up.email,
  up.user_name,
  up.quiz_answers->>'role' as role,
  up.visit_count,
  up.created_at,
  (
    CASE
      WHEN up.quiz_answers->>'role' IN ('founder', 'investor') THEN 40
      WHEN up.quiz_answers->>'role' IN ('policy') THEN 25
      WHEN up.quiz_answers->>'role' IN ('product') THEN 20
      ELSE 10
    END
    + CASE WHEN up.email IS NOT NULL THEN 25 ELSE 0 END
    + CASE WHEN up.visit_count >= 2 THEN 20 ELSE 0 END
    + CASE WHEN up.email LIKE '%@gmail.com' OR up.email LIKE '%@yahoo.com' THEN 0 ELSE 10 END
    + (SELECT COUNT(*) FROM analytics_events ae WHERE ae.plan_id = up.id AND ae.event_type = 'share_clicked') * 15
    + LEAST((SELECT COUNT(*) FROM analytics_events ae WHERE ae.plan_id = up.id AND ae.event_type = 'icebreaker_copied') * 10, 20)
  ) as lead_score
FROM user_plans up
WHERE up.email IS NOT NULL
ORDER BY lead_score DESC;
```

Score 80+ = Hot lead. 50-79 = Warm. <50 = Nurture.

---

## Post-Summit Email Sequence (Context for Later)

| # | When | Subject | CTA |
|---|------|---------|-----|
| 1 | Feb 21 (Day +1) | "Your India AI Summit sessions — what you might have missed" | Reply to engage |
| 2 | Feb 25 (Day +5) | "3 people from the summit you should still connect with" | Reply "interested" |
| 3 | Mar 3 (Day +11) | "What 500+ summit attendees told us about their AI strategy" | Book a 20-min call |
| 4 | Mar 10 (Day +18) | "How [Company type] turned summit connections into a pilot" | Book a call |
| 5 | Mar 17 (Day +25) | "Your summit momentum expires in 7 days" | Apply for strategy sprint |

Tool: Resend (free tier, 3,000 emails/month). Not needed until post-summit.

---

## Implementation Order

1. **Schema changes** (Track 3) — run SQL in Supabase dashboard
2. **Store quiz answers** (4.1) — highest priority, enables everything
3. **Email capture bar** (4.2) — direct lead capture
4. **Analytics tracking** (4.4) — instrument key events
5. **Share text** (4.3) — virality
6. **Visit count** (4.5) — engagement signal
7. **Footer** (4.6) — branding
8. **Netlify Analytics** (4.7) — backstop

---

## Files That Will Be Modified

| File | Changes |
|------|---------|
| `web/src/app/loading/page.tsx` | Add `quiz_answers` to Supabase insert, add `plan_created` analytics event |
| `web/src/app/plan/[id]/page.tsx` | Email capture bar component, share buttons, visit count increment, analytics events |
| `web/src/lib/analytics.ts` | **NEW** — `trackEvent()` utility function |
| `web/src/app/layout.tsx` | "Built by" footer |

**Do NOT modify**:
- `user_plans` table structure beyond the ALTER statements above
- Events/exhibitors data pipeline (that's Track 2, already done)
- Quiz page (no changes needed there)
- Scoring engine

---

## Reference: Full Brainstorm Document

See `docs/LEAD_GEN_BRAINSTORM.md` for the full strategy discussion including consulting conversion funnel, post-summit playbook, positioning advice, and key disagreements between advisors.
