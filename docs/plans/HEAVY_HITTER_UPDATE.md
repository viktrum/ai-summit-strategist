# Heavy Hitter Update - Key Changes

## ✅ Completed: Heavy Hitter Flag Fix

### What Changed
- **Total events**: 463 (removed 17 duplicates)
- **Heavy hitters**: 31 events (6.7% of all events)
- **Overlaps**: Only 5 time slot conflicts (acceptable - gives users choice)

### Script Run Summary
```
Total events: 463 (removed 17 duplicates from original 480)
Heavy hitters: 31 (6.7% of all events)
Time slot overlaps: 5 (acceptable - gives users choice)

Distribution by date:
- Feb 16: 2 events (Stuart Russell, hardware safety)
- Feb 17: 4 events (Yoshua Bengio, Vinod Khosla, OpenAI)
- Feb 18: 1 event (Brad Smith panel)
- Feb 19: 11 events ⭐ (THE VIP DAY - Bill Gates, Sam Altman, Sundar Pichai, Demis Hassabis, Yann LeCun, Rishi Sunak)
- Feb 20: 13 events ⭐ (Closing VIP sessions)
```

### VIPs Now Captured
**Keynotes**:
- Bill Gates (Feb 19, 11:50)
- Sam Altman (Feb 19, 12:40)
- Yann LeCun (Feb 19, 12:54)
- Brad Smith (Feb 19, 13:08)
- Demis Hassabis (Feb 19, 13:22)
- Arthur Mensch (Feb 19, 15:00)
- Rishi Sunak (Feb 19, 17:08)
- Sundar Pichai (Feb 20, 09:30)
- Cristiano Amon (Feb 20, 12:38)
- Vinod Khosla (Feb 20, 13:34)
- Inaugural Session (Feb 19, 09:40)

**VIP Panels**:
- Stuart Russell (3 sessions)
- Jaan Talinn (AI safety)
- Yoshua Bengio (4 sessions on governance)
- Ashwini Vaishnaw - Indian IT Minister (3 sessions)
- OpenAI sessions (3 total)
- Anthropic fireside chat

---

## 🔄 New Recommendation Strategy: "Heavy Hitter First"

### Old Flow (DEPRECATED)
1. User completes quiz
2. System filters 463 events → Top 30 candidates
3. AI picks best 10-12 events
4. Heavy hitters may or may not appear (based on scoring)

### New Flow (IMPLEMENTED)
1. User completes quiz
2. **STEP 1**: Show all heavy hitters for selected dates (5-15 VIPs)
3. **User selects 4-5** must-attend VIP sessions
4. **STEP 2**: System filters remaining events → Top 25 domain-matched candidates
5. **STEP 3**: AI picks best 5-7 from candidates + writes icebreakers for ALL (including HH)
6. Final plan: 10-12 events (4-5 HH + 5-7 matched)

### Why This Works Better
- **User control**: They pick which VIPs matter to them
- **No missed opportunities**: All 31 VIPs visible upfront
- **Better matching**: Domain matching focuses on non-VIP sessions
- **Solves overlap problem**: User chooses between overlapping VIPs
- **Strategic**: Follows real conference behavior (everyone wants VIPs, then fills gaps)

---

## 📝 UX Changes Required

### NEW Component: Heavy Hitter Selection Screen
**File**: `src/components/HeavyHitterSelector.tsx`

**Trigger**: After quiz submission, BEFORE final plan generation

**Layout**:
```
┌────────────────────────────────────────┐
│ First, pick your must-attend VIP      │
│ sessions (4-5 recommended)             │
├────────────────────────────────────────┤
│ Feb 19 - The VIP Day                   │
│                                        │
│ ☐ 11:50 AM - Bill Gates               │
│   Keynote at Plenary Hall             │
│   🔥 VIP Keynote                       │
│                                        │
│ ☐ 12:40 PM - Sam Altman (OpenAI)      │
│   Keynote at Plenary Hall             │
│   🔥 VIP Keynote                       │
│                                        │
│ ☐ 12:54 PM - Yann LeCun                │
│   Executive Chairman, AMI Labs        │
│   🔥 VIP Keynote                       │
│                                        │
│ ... (show all HH for selected dates)  │
│                                        │
│ [Generate My Full Schedule] ──────────►│
└────────────────────────────────────────┘
```

**Validation**:
- Warn if 0 selected: "Consider picking at least 1 VIP"
- Warn if >5 selected: "We recommend 4-5 to leave room for other sessions"
- Show counter: "3 / 5 selected"

---

## 🔧 Backend Changes Required

### New Edge Function: `get-heavy-hitters`
**Purpose**: Fetch all heavy hitters for selected dates
**Input**: `{ dates: ["2026-02-19", "2026-02-20"] }`
**Output**: Array of heavy hitter events with basic info

```typescript
// Query
SELECT event_id, id, title, date, start_time, venue,
       speakers, summary_one_liner, networking_signals
FROM events
WHERE date = ANY(dates)
  AND (networking_signals->>'is_heavy_hitter')::boolean = true
ORDER BY date, start_time;
```

### Updated Edge Function: `generate-plan`
**New Input**:
```typescript
{
  profile: UserProfile,
  dates: string[],
  selected_heavy_hitter_ids: string[]  // NEW
}
```

**Updated RPC**: `get_candidate_events`
```sql
CREATE OR REPLACE FUNCTION get_candidate_events(
  user_tech_level int,
  user_keywords text[],
  user_dates date[],
  selected_hh_ids text[]  -- NEW parameter
)
RETURNS setof events
AS $$
  SELECT * FROM events
  WHERE
    date = ANY(user_dates)
    AND event_id != ALL(selected_hh_ids)  -- EXCLUDE already-selected HH
    AND technical_depth BETWEEN (user_tech_level-1) AND (user_tech_level+1)
    AND keywords && user_keywords
  ORDER BY date, start_time
  LIMIT 25;
$$ LANGUAGE sql;
```

---

## 📊 Data Quality Notes

### Heavy Hitter Criteria (for transparency)
1. **VIP Keynotes**: By event ID (hardcoded list of 10 plenary sessions)
2. **VIP Names**: Search title + speakers for Stuart Russell, Jaan Talinn, Yoshua Bengio, Bill Gates, Ashwini Vaishnaw, etc.
3. **Tier-1 Orgs**: OpenAI, Anthropic, Google DeepMind, Meta AI (in title/speakers/partners)
4. **VIP Keywords**: "Fireside Chat", "Inaugural Session", "Secretary-General" (title only)

### What's NOT Heavy Hitter (intentionally excluded)
- NVIDIA sessions (14 total, too many) - kept generic "AI infrastructure" valuable but not VIP-tier
- UN/World Bank topic sessions (kept only major global sessions)
- General "Minister of X" panels (kept only Ashwini Vaishnaw - Indian IT Minister)
- Generic policy roundtables

---

## ✅ Files Updated

1. ✅ `sessions_enriched.json` - Heavy hitter flags fixed
2. ✅ `CLAUDE.md` - Updated strategy section, scoring weights, three-stage flow
3. ⚠️ `plan.md` - Needs manual update for new UX flow (see this doc)

---

## 🚀 Next Steps for Implementation

1. **Run dedupe script** (from plan.md Phase 1.1) - clean 17 duplicates
2. **Update Supabase schema** - add RPC function with new signature
3. **Build HeavyHitterSelector component** (15 minutes)
4. **Create `get-heavy-hitters` Edge Function** (10 minutes)
5. **Update `generate-plan` Edge Function** (10 minutes)
6. **Wire up API calls** in frontend (10 minutes)
7. **Test flow**: Quiz → HH Selection → Final Plan

**Total additional time**: ~1 hour added to original 3.5-hour plan = **4.5 hours total**

---

## 🎯 Success Metrics (Updated)

### Must Have:
- ✅ 31 heavy hitters visible when appropriate dates selected (6.7% of 463 events)
- ✅ User can select 4-5 VIPs before generating full plan
- ✅ Final plan includes user-selected HH + domain-matched events
- ✅ No duplicate recommendations (HH shouldn't appear twice)
- ✅ Icebreakers generated for ALL events (including HH)

### Nice to Have:
- Show "VIP Density" indicator per day (Feb 19 = 11 VIPs)
- "Why this VIP matters for you" hint on HH selection screen
- Allow users to skip HH selection ("Just match me automatically")

---

## 🐛 Known Issues & TODOs

- [x] 5 time slot overlaps for heavy hitters - acceptable, gives users choice
- [x] Show all 31 HH for selected dates (filtered by date)
- [x] Feb 16 only shows 2 HH - still show selection screen
- [ ] Profile extraction (Prompt A) - where does it fit in new flow?

---

## 📞 Questions for Review

1. **HH Selection UX**: Should it be a separate screen or inline in the modal?
2. **Minimum HH**: Force at least 1 selection or allow 0?
3. **Maximum HH**: Hard cap at 5 or just warn at 6+?
4. **Feb 19 dominance**: 11 VIPs in one day - how to help users pick?
5. **Scoring weights**: Should we reintroduce "Halo Effect" for HH icebreaker generation?
