# XLSX vs Production Events Comparison Analysis

**Generated**: 2026-02-15
**XLSX Source**: `data/raw/AI Summit (Database) .xlsx`
**Production Source**: `data/production/events.json`

---

## Executive Summary

| Metric | Count |
|--------|-------|
| XLSX total events (parsed from 5 day sheets) | 601 |
| Production total events | 463 |
| **Matched** (present in both) | 401 |
| **XLSX-only** (new events not in production) | 200 |
| **Production-only** (not in XLSX) | 61 (mostly named keynotes on Day 19) |
| Founders list (separate sheet) | 136 people with roles/companies |

**Key Insight**: The XLSX contains a significant number of new events (200), though 77 of these are generic entries (untitled "Keynote", "Panel", "Conversation", etc.) primarily from Days 19-20 (the main summit plenary sessions). There are **123 new named/specific sessions** with proper titles.

---

## Data Structure Comparison

### XLSX Structure (6 sheets)

| Sheet | Rows | Maps to Date |
|-------|------|-------------|
| Founders Name | 136 | N/A (people list) |
| Day 16 | 105 | 2026-02-16 |
| Day 17 | 148 | 2026-02-17 |
| Day 18 | 126 | 2026-02-18 |
| day 19 | 37 | 2026-02-19 |
| day20 | 185 | 2026-02-20 |

**XLSX Columns**: Title, Date (Excel serial), Time (string or fraction), Location, ROom, Speakers (literal "Speakers" header), Name, name, name_1, name_2, name_3, Description, Description_1..Description_7

**Note**: Speaker data is spread across 5 columns (Name, name, name_1, name_2, name_3) with each column containing "SpeakerName, Title/Role, Organization" style entries.

### Production Structure (23 fields per event)

Core: id, title, description, date, start_time, end_time, venue, room, speakers, knowledge_partners, session_type, event_id, add_to_calendar, notes

Enriched: summary_one_liner, technical_depth, target_personas, networking_signals, keywords, goal_relevance, icebreaker, networking_tip, logo_urls

---

## Match Quality Breakdown

| Tier | Method | Count | Description |
|------|--------|-------|-------------|
| Tier 1 | exact_title_date | 387 | Title similarity >95% + same date |
| Tier 2 | high_title_date | 3 | Title similarity 75-95% + same date |
| Tier 3 | date_room_time | 7 | Same date + room + start time (different titles) |
| Tier 5 | title_only | 4 | High title similarity but dates may differ |

**387 out of 401 matches are exact title+date matches** -- very high confidence matching.

---

## Field-Level Differences (for 401 matched events)

| Field | XLSX Has More/Different | Count |
|-------|------------------------|-------|
| **end_time** (XLSX has it, production is null) | 380/401 (95%) |
| **description** (XLSX is longer) | 273/401 (68%) |
| **speakers** (XLSX has more speaker entries) | 33/401 (8%) |
| **room** (different room names) | 15/401 (4%) |
| **title** (slightly different wording) | 11/401 (3%) |

### Key Findings

1. **end_time is the biggest gap**: Production has `null` for `end_time` on nearly all events. XLSX provides actual end times (e.g., "9:30 AM - 10:30 AM" parsed to both start and end). This is extremely valuable for the scheduling algorithm which needs duration/overlap detection.

2. **XLSX descriptions are more complete**: In 273 events, the XLSX has a longer description. The XLSX concatenates content from up to 8 description columns, providing richer context.

3. **Speaker data is richer in XLSX for some events**: 33 events have more speakers listed in the XLSX (speakers spread across 5 name columns vs. production's single semicolon-separated string).

4. **Room discrepancies are minor**: 15 events have slight room name differences (e.g., formatting differences like "L2 Audi 2" vs "L2 Audi II").

---

## XLSX-Only Events (200 total)

### By Date Distribution

| Date | Count | Notes |
|------|-------|-------|
| 2026-02-16 | 8 | Mostly afternoon/evening sessions |
| 2026-02-17 | 36 | Large number of new panel sessions and hosted events |
| 2026-02-18 | 59 | Research Symposium events + plenary keynotes |
| 2026-02-19 | 31 | Plenary keynotes (many generic) |
| 2026-02-20 | 66 | Largest day -- many new topic panels + plenary keynotes |

### Categories

| Category | Count | Description |
|----------|-------|-------------|
| Generic entries (Keynote, Panel, Conversation, Break, etc.) | 77 | Untitled plenary sessions, likely the same events that production has as named "Keynote Session: [Speaker]" |
| Named/specific sessions | 123 | New events with proper titles and descriptions |

### Notable New Named Sessions

**Day 16 (Feb 16)**:
- Safe & Trusted AI at Scale
- Empowering Youth in AI Global Governance
- AI x Creativity: Skilling for Innovation in the Intelligent Economy
- Women & Youth in AI: Keynotes, Milestones and Recognition
- Large Cultural Models - Building ethical and cultural AI from India, for the world

**Day 17 (Feb 17)**:
- From Research to Reality: Building Safe and Localized Health-AI Solutions for India
- Pushing the Frontier of AI in Education
- The Role of AI in Drug Discovery
- Beyond Language Models: The Next AI Race for Science, Biology, Energy & Sovereignty
- AI for ALL: Final Showcase + Top 20 Finalists Showcase
- YUVAi: Global Youth Challenge - Grand Finale
- AI in Financial services - From Innovation to Impact
- Voice as the Default Interface for India's Next Billion Users

**Day 18 (Feb 18)** - Research Symposium:
- Keynote for Research Symposium by Sir Demis Hassabis (CEO & Co-Founder, Google DeepMind)
- Keynote for Research Symposium by Prof. Yoshua Bengio
- Keynote for Research Symposium by Dr Yann LeCun
- Keynotes for Research Symposium by Prof. Dame Wendy Hall
- Opening Ceremony of Research Symposium
- Research Dialogue: AI as a Catalyst
- International Panel 1: Challenges of Global South
- International Panel 2: Safe & Trusted AI
- Multiple hosted sessions (Google, Accenture, BITS Pilani, Bhashini, etc.)

**Day 20 (Feb 20)**:
- AI for Agriculture: Scaling Intelligence for Food and Climate Resilience
- Democratizing AI for Industry and Society
- Panel: Data Sovereignty / AI in Science / AI & Cybersecurity / AI in Healthcare
- Regional Ministerial Dialogue on AI-Ready Digital Infrastructure
- Building Population-Scale Digital Public Infrastructure for AI
- U.S. AI Standards

---

## Production-Only Events (61 total)

### By Date Distribution

| Date | Count |
|------|-------|
| 2026-02-16 | 9 |
| 2026-02-17 | 15 |
| 2026-02-18 | 2 |
| 2026-02-19 | 23 |
| 2026-02-20 | 12 |

### Notable Production-Only Events

**Named Keynote Sessions (Day 19 -- 23 events)**:
These are the high-profile keynotes that production has with full speaker names in titles, but XLSX lists as generic "Keynote":
- Keynote Session: Bill Gates, Chair, Gates Foundation
- Keynote Session: Sam Altman, CEO, OpenAI
- Keynote Session: Demis Hassabis, Co-founder and CEO, Google DeepMind
- Keynote Session: Rishi Sunak, Former PM, UK
- Keynote Session: Brad Smith, Vice Chair and President, Microsoft
- Keynote Session: Yann LeCun, Executive Chairman, Advanced Machine Intelligence Labs
- Keynote Session: Sundar Pichai (Day 20)
- Keynote Session: Vinod Khosla, Founder, Khosla Ventures (Day 20)
- Keynote Session: Cristiano Amon, President and CEO, Qualcomm (Day 20)
- And many more VIP speakers

**Other Production-Only Sessions**:
- Redesigning the AI Economy
- Sovereign AI for National Security: India's Path to digital Sovereignty
- AI Masterclass in Robotics
- Countering Disinformation Warfare and Building Resilient Societies
- Powering Quantum Technologies with AI: U.S.-India Collaboration
- From Silicon to Society: Power Transitions in the AI Century

**Explanation**: The XLSX has generic "Keynote" entries at the same date/time/room as these production named keynotes. The matching algorithm could not pair them because the titles are completely different ("Keynote" vs "Keynote Session: Bill Gates..."). These are the SAME events -- just the XLSX lacks named titles for plenary keynotes.

---

## Founders List (Separate Sheet)

136 founders/executives with:
- **Name**: Full name
- **Post**: Title and company (e.g., "CEO, Voltairtech")
- **LinkedIn URL**: Where available (not all have URLs)

**Sample entries**:
- Harshal Vadgama, CEO, Voltairtech
- Aarthi Subramanian, COO and Executive Director, TCS
- Ajay Vij, Senior Country Managing Director, Accenture India
- Alexandr Wang, Chief AI Officer, Meta
- Akhilesh Tuteja, Head of Clients & Industries, KPMG India

This list is useful for the networking recommendation engine -- these are confirmed summit attendees who could be networking targets.

---

## Merged File Summary

**Output**: `data/enriched/events_merged_v2.json`

| Source | Count | Enrichment Status |
|--------|-------|-------------------|
| Both (matched) | 401 | Fully enriched from production |
| Production only | 61 | Fully enriched from production |
| XLSX only | 200 | **Needs enrichment** |
| **Total** | **662** | |

### Data Merged from XLSX into Matched Events:
- `end_time`: Added from XLSX when production had null (380 events)
- `xlsx_speakers`: Full speaker array preserved for reference
- `xlsx_description`: Longer description preserved when available
- `xlsx_time_raw`: Original time string for verification

### XLSX-Only Events Need:
- `summary_one_liner`
- `technical_depth`
- `target_personas`
- `networking_signals`
- `keywords`
- `goal_relevance`
- `icebreaker`
- `networking_tip`

---

## Recommendations

1. **Prioritize the 123 named XLSX-only sessions** for enrichment -- these are substantive new events with titles and often descriptions/speakers.

2. **Handle the 77 generic keynotes carefully**: These likely overlap with production-only named keynotes. Consider matching "Keynote" events at same date+time+room with production "Keynote Session: [Speaker]" events before enriching. Otherwise you get duplicate events.

3. **Update production end_times**: The XLSX provides end_time data for 380 events where production has null. This is critical for overlap detection in the scheduling algorithm.

4. **Consider the Founders list**: 136 confirmed attendees with roles and companies could enhance the networking recommendation system.

5. **Potential deduplication needed**: Some XLSX-only generic "Keynote"/"Panel" entries on Days 19-20 are likely the same events as production-only named keynotes -- just the XLSX uses generic titles while production scraped specific speaker names.
