# AI Summit Strategist

A personalized networking itinerary generator for the **India AI Impact Summit 2026** (Feb 16-20, New Delhi). Built to help attendees maximize their time by identifying high-ROI sessions and networking opportunities.

**Live at**: [aisummit26.info](https://aisummit26.info)

## What it does

- **30-second quiz** captures your role, interests, and goals
- **Deterministic scoring engine** ranks 463 events by relevance (keyword match, persona fit, networking signals, heavy hitter presence)
- **Greedy scheduling** picks non-overlapping events, surfaces alternatives for conflicts
- **AI-powered personalization** generates icebreakers and networking strategies via Claude
- **Shareable plans** with unique URLs, WhatsApp sharing, PDF export, and calendar (ICS) download
- **Explore mode** lets you browse all 463 events and 715 exhibitors with filters

## Tech Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), Tailwind CSS, Lucide icons
- **Backend**: Supabase (PostgreSQL + JSONB for plan storage)
- **AI**: Anthropic Claude for profile extraction and networking strategy
- **Hosting**: Netlify
- **Data**: 463 events and 715 exhibitors, pre-enriched with AI-generated metadata

## Architecture

The app uses a **hybrid pre-computation strategy** to avoid sending 463 events to an LLM on every request:

1. **Offline enrichment** (done once): AI generates "Rich DNA" metadata for all events - one-liners, technical depth scores, target personas, networking signals, keywords
2. **Runtime scoring** (per user): Deterministic scoring narrows to ~30 candidates per day, then greedy scheduling picks the best non-overlapping set
3. **AI personalization** (per user): Claude writes icebreakers and strategy notes for the final selection

## Getting Started

```bash
cd web
npm install
npm run dev
```

Create a `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## Key Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page with date selection |
| `/quiz` | Role, interests, and goals quiz |
| `/loading` | Terminal-style animation during plan generation |
| `/plan/[id]` | Personalized schedule with networking intel |
| `/explore` | Browse all 463 events + 715 exhibitors |

## Project Structure

```
web/
  src/
    app/           # Next.js pages (landing, quiz, loading, plan, explore)
    components/    # Reusable UI (NavBar, EventCard, TimeSlotRow, etc.)
    data/          # Static JSON (events, exhibitors - pre-enriched)
    lib/           # Utilities (scoring, types, time-utils, supabase client)
```

## Built by

**Piyush Mayank** - [LinkedIn](https://linkedin.com/in/piyushmayank/) | [X](https://x.com/piyushmayank_)
