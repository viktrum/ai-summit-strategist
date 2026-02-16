# Lead Generation & Consulting Pipeline — Brainstorm Document

**Date**: Feb 16, 2026
**Participants**: Product Leader (PL), Management Consultant (MC), GTM Strategist (GTM)
**Goal**: Convert AI Summit Strategist users into consulting clients

---

## The Setup

**What we have**: A live conference app (aisummit26.info) with 639 events, personalized plan generation, shareable URLs. No auth, no email collection. Users include directors and CEOs of non-digitally native companies.

**What we want**: Consulting projects. Email list. Ongoing engagement hook.

**Ideas on the table**:
1. Email collection modal (last 2 days, or earlier as pill)
2. IP tracking in `user_plans` table
3. Netlify analytics triggers
4. Post-event email with session analysis + consulting CTA

---

## 1. Email Capture — When, Where, How

### Product Leader

Three-touch strategy:
- **Touch 1 (Day 1-2)**: Non-modal banner after plan generation. Copy: "Want your plan on all devices? Enter your email and we'll send you a direct link + real-time updates." Pure utility play. Expected conversion: 15-25%.
- **Touch 2 (Day 3-5, return visits only)**: One-time modal. Copy: "Your summit's almost over. The real work starts now. Get a personalized post-summit brief." Expected conversion: 30-45%.
- **Touch 3**: Share-to-LinkedIn for social proof (passive, not email collection).

**Hard rule**: Never gate plan generation behind email. Never show modal on first visit.

### Management Consultant

Agrees with PL timing but sharper on copy:
> "Unlock Your Post-Summit Intelligence Brief — After the summit, I'll compile session transcripts, speaker announcements, and key deals from the events in YOUR plan."

Emphasizes: the email modal must appear Day 4-5 (not Day 1) because by then the user trusts the tool. Any earlier feels transactional.

### GTM Strategist

Prefers a **persistent bottom bar** over a modal for Days 1-3 (less aggressive, always visible), then upgrades to a **slide-up modal on Day 4-5** for higher conversion.

Additional Indian market insights:
- **WhatsApp > Email** for engagement in India. Consider adding a WhatsApp opt-in alongside email. A `wa.me` link costs zero dev time and will outperform email 3:1.
- Add "100% free, no spam" explicitly — Indian enterprise users expect upsells.
- Use placeholder "Work email preferred" to nudge company emails (moves ratio from ~30% to ~55%).
- Expected conversion: 8-15% with bottom bar, 18-22% with modal on Days 4-5.

### Consensus

| Day | Mechanism | Copy Theme |
|-----|-----------|------------|
| Day 1-3 | Persistent bottom bar on plan page | "Get your plan on all devices" (utility) |
| Day 4-5 | One-time slide-up modal | "Get your post-summit intelligence brief" (value) |
| Always | WhatsApp opt-in option | "Get updates on WhatsApp" |

**All three agree**: Never gate the plan. Email is optional. Value first, ask second.

---

## 2. IP Tracking — Worth It?

### Product Leader

Add it. Grab from `x-nf-client-connection-ip` header. Store in `user_plans.ip_address`. Low effort, useful for deduplication.

### Management Consultant

**Against it for lead gen.** Under India's DPDP Act 2023, IP + behavioral data = personal data. Reputational risk outweighs value. Quiz data is far richer than IP anyway. "The juice is not worth the squeeze."

### GTM Strategist

**Agrees with MC — low value.** Everyone at the summit is on the same conference Wi-Fi or Jio mobile network. IP will resolve to "Reliance Jio" or "Bharat Mandapam venue network," not company names. Enrichment tools (Clearbit, 6sense) are expensive ($99-$15K/year) and won't work well for Indian IPs.

**Alternative**: Add an optional "Company" text field to the email capture form. 40-60% will fill it in. Those who don't — their work email domain tells you anyway.

### Consensus

**Skip IP tracking.** Not worth the privacy risk or engineering time for conference Wi-Fi IPs. Instead: optional company field on email form + work email nudge.

---

## 3. Analytics — What to Track

### Product Leader

Priority events to track:

| Event | Priority | Signal |
|-------|----------|--------|
| `plan_created` | P0 | Core funnel |
| `plan_viewed` (with visit count) | P0 | Engagement depth |
| `email_submitted` | P0 | Conversion |
| `icebreaker_copied` | P1 | **Strongest buying signal** — they're actually using tactics |
| `event_expanded` | P1 | Interest depth |
| `share_clicked` | P2 | Virality |

### GTM Strategist

Agrees with PL list, adds:
- `plan_return_visit` — repeat visitors are hottest leads
- `explore_search` — what they're looking for beyond recommendations

**Recommends against**: page views, scroll depth, time on page. Not worth instrumenting in a 4-hour sprint.

**Implementation**: Custom `analytics_events` table in Supabase (not Mixpanel/PostHog — no time to learn a new tool). One table, one client-side function, done.

**Backstop**: Turn on Netlify Analytics ($9/mo, 2 clicks, zero code). Gives page views and referrers out of the box.

### Management Consultant

Adds the concept of a **behavioral lead score** computed from these events:

| Signal | Points |
|--------|--------|
| CXO/Director role | +40 |
| VP/Head role | +25 |
| Founder/Business role | +20 |
| Email submitted | +25 |
| Return visits >= 2 | +20 |
| Goal = "AI Strategy" | +15 |
| Shared plan | +15 |
| Company email provided | +10 |
| Expanded 5+ events | +10 |
| Icebreaker copied | +10 (PL says +20) |

Score 80+ = Hot lead (personal outreach within 48 hours). 50-79 = Warm. <50 = Nurture only.

### Consensus

- Custom Supabase `analytics_events` table (simple, no external tools)
- Track 5-6 key events max
- Turn on Netlify Analytics as backstop
- Compute lead scores post-summit via SQL query (not real-time)

---

## 4. The Post-Event Email Deliverable

### All three agree on the core asset: "Post-Summit Intelligence Brief"

### Management Consultant (Most Detailed on Structure)

A PDF-quality deliverable, NOT a newsletter. Structure:

1. **Your Summit at a Glance** — visual timeline of their sessions, personalized stats
2. **Key Insights from Your Sessions** — 2-3 takeaways per session from transcripts/coverage, each connected to their role: "For someone in [role], this means..."
3. **The Gap Analysis** — "Your peers are investing in [X]. Here's where you may be falling behind." (Creates the "burning platform")
4. **Your Follow-Up Playbook** — 3 people to connect with on LinkedIn, message templates, "3 conversations to have with your team this week"
5. **Soft CTA** — "I'd be happy to spend 30 minutes thinking through how to operationalize what you learned. No pitch, just a conversation."

**Key principle**: The brief must feel like it came from a consulting firm, not a newsletter. Incomplete diagnosis is deliberate — reveals enough to be alarming, leaves "so what do I do about it?" as the conversation starter.

### Product Leader

Send from a real email (not noreply). Use Resend/Postmark, not Mailchimp. Personalized, per-user content.

**Timeline**:
- Week 1: Quick debrief (sections 1, 3, 4) — speed matters
- Week 2: Full brief with session insights (section 2)
- Week 3: Optional "3 things that happened since the summit"

### GTM Strategist (Most Detailed on Sequence)

5-email sequence with "Insight Escalation" — each email delivers more value while gradually introducing consulting CTA:

| # | When | Subject | CTA |
|---|------|---------|-----|
| 1 | Feb 21 (Day +1) | "Your India AI Summit sessions — what you might have missed" | Reply to engage (trains Gmail you're not spam) |
| 2 | Feb 25 (Day +5) | "3 people from the summit you should still connect with" | Reply "interested" for deeper brief |
| 3 | Mar 3 (Day +11) | "What 500+ summit attendees told us about their AI strategy" | **Book a 20-min call** (first consulting CTA) |
| 4 | Mar 10 (Day +18) | "How [Company type] turned summit connections into a pilot" | Book a call |
| 5 | Mar 17 (Day +25) | "Your summit momentum expires in 7 days" | Apply for strategy sprint |

**Expected metrics** (Indian B2B benchmarks):
- Email 1 open rate: 25-35%
- Reply rate on email 1: 5-8%
- Click rate on consulting CTA: 2-4% of opens
- Call-to-proposal conversion: 30-40% (warm leads)
- Math: 200 emails → 3-5 calls → 1-3 clients

**Tool**: Resend (free tier, 3,000 emails/month, React templates, 20 min to integrate).

### Consensus

- The post-summit brief is the highest-leverage asset
- No consulting CTA in emails 1-2 (pure value delivery)
- Consulting CTA appears in email 3 (Day +11), framed as natural next step
- Send from personal email, not noreply
- Speed matters — first email within 24 hours of summit ending

---

## 5. The Consulting Conversion Funnel

### Management Consultant's Framework

```
ANONYMOUS USER (app usage)
  ↓ email collection
IDENTIFIED USER (email + quiz profile)
  ↓ post-summit brief
ENGAGED SUBSCRIBER (opened, clicked, replied)
  ↓ soft CTA: "30 min conversation"
WARM LEAD (booked call)
  ↓ discovery call → proposal
CONSULTING CLIENT
```

### The Entry Point Offer

MC recommends: **"AI Readiness Assessment"** — 45-min Zoom + 5-page deliverable. Free for first 5-10 summit attendees.

This leads to:
- **Workshop** (INR 5-10 lakhs / $6-12K): 2-day on-site with leadership team → AI Opportunity Map, Use Case Roadmap, Build vs Buy Analysis
- **Retainer** (INR 2-5 lakhs/month): Monthly advisory + sprint support

### The Narrative That Sells

**MC's key insight**: "I built this in 4 hours" is your strongest card. For a CEO who's been told "AI will take 18 months," seeing a 4-hour build that works is destabilizing in the best way.

Pitch: "This app is what happens when you apply AI correctly. Imagine what happens when we apply this approach to your supply chain / customer service / internal operations."

### Positioning

**Don't say**: "I am an AI consultant."
**Say**: "I help organizations move from AI experimentation to AI execution."
**Title**: "AI Strategy & Transformation" or "Applied AI Architect" (not "Consultant" — that's a commodity)

---

## 6. Social Proof & Virality

### GTM Strategist

- **Pre-populated share text** for LinkedIn/WhatsApp (15 min to build):
  > "Just got my personalized AI Summit strategy from aisummit26.info — it picked my top sessions and even gave me icebreakers. Try it if you're at #IndiaAISummit"
- **"Built by [Name]" footer** with LinkedIn link (10 min)
- **QR code on phone lock screen** — face-to-face at conference converts at 60%+
- **LinkedIn posts**: Day 1 (launch), Day 3 (data insights), Day 5 (wrap-up with aggregated quiz data)

### Product Leader

- **"Who's Here" aggregate stats**: "47 founders, 12 investors, and 23 enterprise leaders are using AI Summit Strategist" — social proof without exposing individual data
- **"Hot Sessions" badge**: "34 strategists picked this session" — Waze/Google Maps effect

### Management Consultant

- **No consulting CTAs in the app during the event.** The app must feel purely generous. Any "sales funnel" smell destroys trust.
- Post-summit: publish "The AI Summit Intelligence Report" using aggregated quiz data as a LinkedIn post / lead magnet

### Consensus

During summit: share mechanics + personal branding footer + QR code. No consulting CTAs.
Post-summit: data-driven LinkedIn content + the intelligence brief does the selling.

---

## 7. On-the-Ground Tactics (Non-Digital)

### Product Leader (Most Actionable)

1. Check `user_plans` table for CXO/Director profiles
2. Note which sessions they're attending
3. Attend those sessions yourself
4. After the session: "I built the AI Summit Strategist app — did you find it useful?"

This is the highest-conversion play. The app is the conversation starter.

### GTM Strategist

- QR code on phone for corridor conversations
- Face-to-face demo converts at 60%+ for a free tool

---

## 8. Post-Summit Playbook

### GTM Strategist

**Week 1** (Feb 21-27):
- Send Email 1 to all captured emails
- Run lead scoring SQL query
- Export Hot leads to spreadsheet
- LinkedIn connection requests to Hot leads: "Great to see you used AI Summit Strategist..."
- Post LinkedIn wrap-up with aggregated data

**Week 2-4** (Feb 28 - Mar 17):
- Execute email sequence (emails 2-5)
- Respond to every reply within 4 hours
- For call bookers: prepare one-page brief from their quiz profile

**The Template Play**: This app architecture works for ANY conference. Next targets: Bangalore Tech Summit, ET World AI Show, NASSCOM events. Eventually: white-label for organizers ($5-15K/event).

**Don't let the domain die.** After Feb 20, redirect to: results page with aggregated data + email capture + consulting services link.

---

## 9. Technical Changes Needed

### Schema Changes (All Three Agree)

**Modify `user_plans` table**:
```sql
ALTER TABLE user_plans ADD COLUMN email TEXT;
ALTER TABLE user_plans ADD COLUMN quiz_answers JSONB;  -- CRITICAL: currently only in localStorage
ALTER TABLE user_plans ADD COLUMN lead_score INTEGER;
ALTER TABLE user_plans ADD COLUMN visit_count INTEGER DEFAULT 1;
ALTER TABLE user_plans ADD COLUMN last_visited_at TIMESTAMPTZ;
```

**New table: `analytics_events`**:
```sql
CREATE TABLE analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid REFERENCES user_plans(id),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  user_agent text,
  created_at timestamptz DEFAULT now()
);
```

**Skip**: IP tracking, full auth system, payment tier, social login.

### MC's Critical Finding

> "Your `user_plans` table currently does NOT store quiz answers — they live only in localStorage. This is the single most important gap to fix. Quiz answers are your lead qualification data."

---

## 10. Priority Matrix — What to Build

### Before Summit (Tonight, ~3-4 hours)

| Task | Time | Impact |
|------|------|--------|
| Store quiz answers in Supabase (`quiz_answers` JSONB column) | 30 min | **Critical** — enables all lead scoring |
| Email capture bottom bar on plan page | 45 min | Direct lead capture |
| Pre-populated share text (LinkedIn/WhatsApp) | 20 min | Virality |
| `analytics_events` table + 3 key events | 30 min | Post-summit intelligence |
| "Built by [Name]" footer with LinkedIn link | 10 min | Personal branding |
| Turn on Netlify Analytics | 5 min | Backstop |

### During Summit (Feb 17-18)

| Task | Time | Impact |
|------|------|--------|
| Slide-up modal for Days 4-5 (higher conversion copy) | 45 min | Higher capture rate |
| Return visitor toast ("50+ people signed up") | 30 min | Social proof |
| Optional company field on email form | 15 min | Lead enrichment |
| Visit count tracking | 30 min | Engagement signal |

### Post-Summit (Feb 21+)

| Task | Time | Impact |
|------|------|--------|
| Post-summit brief generation pipeline | 4-6 hrs | **Highest leverage** |
| Resend integration for email sequence | 1-2 hrs | Delivery mechanism |
| Lead scoring SQL query | 30 min | Prioritize outreach |
| LinkedIn content from aggregated data | 2 hrs | Social proof + reach |
| Conference template for reuse | Ongoing | Scale the model |

---

## Key Disagreements

| Topic | PL | MC | GTM |
|-------|-----|-----|------|
| IP tracking | Do it (low effort) | Skip (legal risk) | Skip (useless at conferences) |
| First email timing | Week 1 post-summit | Day +2 (Feb 22) | Day +1 (Feb 21) — speed matters |
| Consulting CTA timing | Email 3 | Email 2 (subtle gap analysis) | Email 3 (Day +11) |
| WhatsApp capture | Didn't mention | Didn't mention | **Strongly recommends** — 3:1 engagement vs email in India |
| "Hot Sessions" badge | Build it (social proof) | Don't (distraction from lead gen) | Nice-to-have, not priority |

---

## Final Conclusion

### The One-Line Strategy

**Give away an unreasonably good tool → capture email via post-summit value prop → deliver a brief that feels like consulting → offer a free assessment that leads to paid work.**

### The Three Things That Matter Most

1. **Store quiz answers in Supabase tonight.** Without this, you have no lead qualification data. Everything downstream depends on it.

2. **Add email capture (bottom bar) before the summit starts.** Every day without it is lost leads. Even a rough version is better than nothing.

3. **The post-summit intelligence brief is your highest-leverage asset.** It's the proof of competence that makes a CEO say "I need to talk to this person." Invest the most time here (post-summit).

### Realistic Outcome

200-500 app users → 30-80 emails → 10-20 qualified leads → 3-5 calls → 1-3 consulting clients.

One enterprise client from this funnel pays for everything and establishes a reference for future work. The app itself becomes your portfolio piece for years.
