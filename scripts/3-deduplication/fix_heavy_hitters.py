"""
Fix Heavy Hitter Flags - Mark only absolute top-tier VIPs
Includes both Plenary Hall keynotes and key panel discussions
"""

import json
from collections import defaultdict

# Load data
with open('sessions_enriched.json', 'r', encoding='utf-8') as f:
    sessions = json.load(f)

print("=" * 70)
print("FIXING HEAVY HITTER FLAGS")
print("=" * 70)

# Step 1: Reset all heavy hitter flags
original_count = sum(1 for s in sessions if s['networking_signals']['is_heavy_hitter'])
print(f"\nStep 1: Resetting all flags (current: {original_count} heavy hitters)")

for s in sessions:
    s['networking_signals']['is_heavy_hitter'] = False

print(f"  ✓ Reset complete")

# Step 2: Define VIP criteria
# These are the absolute must-attend heavy hitters
VIP_KEYNOTES = [
    # Plenary Hall Keynotes (names in title, speakers field empty)
    {"id": 4591, "name": "Inaugural Session", "date": "2026-02-19"},
    {"id": 4472, "name": "Bill Gates", "date": "2026-02-19"},
    {"id": 4631, "name": "Yann LeCun", "date": "2026-02-19"},
    {"id": 4528, "name": "Brad Smith", "date": "2026-02-19"},
    {"id": 4632, "name": "Demis Hassabis", "date": "2026-02-19"},
    {"id": 4546, "name": "Arthur Mensch", "date": "2026-02-19"},
    {"id": 4596, "name": "Rishi Sunak", "date": "2026-02-19"},
    {"id": 4598, "name": "Sundar Pichai", "date": "2026-02-20"},
    {"id": 4601, "name": "Cristiano Amon", "date": "2026-02-20"},
    {"id": 4602, "name": "Vinod Khosla", "date": "2026-02-20"},
]

# VIP names to search for in BOTH title and speakers fields
# (for panel discussions and other formats)
VIP_NAMES = [
    # AI Pioneers & Researchers
    "Stuart Russell",
    "Jaan Talinn",
    "Yoshua Bengio",
    "Yann LeCun",
    "Demis Hassabis",

    # Tech Leaders & Founders
    "Mukesh Ambani",
    "Sundar Pichai",
    "Brad Smith",
    "Vinod Khosla",
    "Sam Altman",

    # Government & International
    "António Guterres",  # UN Secretary-General
    "Rishi Sunak",
    "Bill Gates",

    # Indian Government VIPs
    "S. Jaishankar",  # External Affairs Minister
    "Ashwini Vaishnaw",  # IT Minister
]

# Organizations/Companies that indicate heavy hitter status
# Only marking the absolute tier-1 organizations and government
HEAVY_HITTER_ORGS = [
    "Google DeepMind",
    "OpenAI",
    "Anthropic",
    "Meta AI",
]

# Additional keywords that indicate government/international VIP status
# (must appear in title or speakers, not just description)
VIP_KEYWORDS_TITLE_ONLY = [
    "Prime Minister",
    "Secretary-General",
    "World Bank",
    "Inaugural Session",
    "Fireside Chat",  # Usually reserved for VIPs at summits
]

# Step 3: Mark keynotes by ID
print(f"\nStep 2: Marking {len(VIP_KEYNOTES)} VIP keynotes by ID...")
marked_keynotes = 0

for vip in VIP_KEYNOTES:
    for s in sessions:
        if s['id'] == vip['id']:
            s['networking_signals']['is_heavy_hitter'] = True
            marked_keynotes += 1
            print(f"  ✓ ID {vip['id']}: {vip['name']} ({vip['date']})")
            break

print(f"  → Marked {marked_keynotes}/{len(VIP_KEYNOTES)} keynotes")

# Step 4: Mark sessions with VIP names in title or speakers
print(f"\nStep 3: Searching for VIP names in titles and speakers...")
marked_panels = 0

for s in sessions:
    # Skip if already marked
    if s['networking_signals']['is_heavy_hitter']:
        continue

    title_lower = s['title'].lower()
    speakers_lower = s.get('speakers', '').lower()
    description_lower = s.get('description', '').lower()
    knowledge_partners_lower = s.get('knowledge_partners', '').lower()

    # Check each VIP name
    for vip_name in VIP_NAMES:
        name_lower = vip_name.lower()

        # Check if VIP appears in title or speakers
        if name_lower in title_lower or name_lower in speakers_lower:
            s['networking_signals']['is_heavy_hitter'] = True
            marked_panels += 1
            print(f"  ✓ VIP {vip_name}: {s['title'][:60]}... ({s['date']} {s['start_time'][:5]})")
            break

print(f"  → Marked {marked_panels} VIP sessions")

# Step 5: Mark sessions with tier-1 organizations
print(f"\nStep 4: Searching for tier-1 organizations (OpenAI, Anthropic, etc)...")
marked_orgs = 0

for s in sessions:
    # Skip if already marked
    if s['networking_signals']['is_heavy_hitter']:
        continue

    title_full = s['title']
    speakers_full = s.get('speakers', '')
    knowledge_partners_full = s.get('knowledge_partners', '')

    # Check for heavy hitter organizations (in title, speakers, or knowledge partners)
    for org in HEAVY_HITTER_ORGS:
        if (org in title_full or org in speakers_full or org in knowledge_partners_full):
            s['networking_signals']['is_heavy_hitter'] = True
            marked_orgs += 1
            print(f"  ✓ ORG {org}: {s['title'][:55]}... ({s['date']} {s['start_time'][:5]})")
            break

print(f"  → Marked {marked_orgs} tier-1 org sessions")

# Step 6: Mark VIP keywords (title/speakers only - more selective)
print(f"\nStep 5: Searching for VIP keywords in titles...")
marked_keywords = 0

for s in sessions:
    # Skip if already marked
    if s['networking_signals']['is_heavy_hitter']:
        continue

    title_full = s['title']
    speakers_full = s.get('speakers', '')

    # Check for VIP keywords (title or speakers only, not description)
    for keyword in VIP_KEYWORDS_TITLE_ONLY:
        if keyword in title_full or keyword in speakers_full:
            s['networking_signals']['is_heavy_hitter'] = True
            marked_keywords += 1
            print(f"  ✓ VIP Keyword '{keyword}': {s['title'][:50]}... ({s['date']} {s['start_time'][:5]})")
            break

print(f"  → Marked {marked_keywords} VIP keyword sessions")

# Step 7: Verify no time overlaps
print(f"\nStep 6: Checking for time slot conflicts...")
heavy_hitters = [s for s in sessions if s['networking_signals']['is_heavy_hitter']]
time_slots = defaultdict(list)

for hh in heavy_hitters:
    slot_key = (hh['date'], hh['start_time'][:5])  # Use HH:MM
    time_slots[slot_key].append(hh)

overlaps = {slot: events for slot, events in time_slots.items() if len(events) > 1}

if overlaps:
    print(f"  ⚠️  WARNING: {len(overlaps)} time slots have multiple heavy hitters:")
    for slot, events in sorted(overlaps.items()):
        print(f"\n    {slot[0]} at {slot[1]}:")
        for e in events:
            print(f"      - ID {e['id']}: {e['title'][:50]}")
else:
    print(f"  ✓ No overlaps detected")

# Step 8: Summary by date
print(f"\nStep 7: Heavy hitter distribution by date:")
by_date = defaultdict(list)
for hh in heavy_hitters:
    by_date[hh['date']].append(hh)

for date in sorted(by_date.keys()):
    events = by_date[date]
    print(f"  {date}: {len(events)} events")
    for e in sorted(events, key=lambda x: x['start_time']):
        print(f"    {e['start_time'][:5]} - {e['title'][:55]}")

# Step 9: Check for duplicates
print(f"\nStep 8: Checking for duplicate IDs...")
all_ids = [s['id'] for s in sessions]
hh_ids = [s['id'] for s in heavy_hitters]
duplicate_ids = [id for id in set(hh_ids) if hh_ids.count(id) > 1]

if duplicate_ids:
    print(f"  ⚠️  WARNING: Duplicate heavy hitter IDs found: {duplicate_ids}")
    print(f"     These indicate duplicate events in the source data")
else:
    print(f"  ✓ No duplicate IDs in heavy hitters")

# Step 10: If too many, warn (target ~40)
target_count = 40
if len(heavy_hitters) > target_count + 10:
    print(f"\n⚠️  WARNING: {len(heavy_hitters)} heavy hitters exceeds target of ~{target_count}")
    print(f"   Consider tightening criteria further")
elif len(heavy_hitters) > target_count + 5:
    print(f"\n⚠️  Note: {len(heavy_hitters)} heavy hitters slightly above target of ~{target_count}")
    print(f"   This is acceptable given overlaps")

# Step 11: Save updated data
print(f"\nStep 9: Saving updated data...")
with open('sessions_enriched.json', 'w', encoding='utf-8') as f:
    json.dump(sessions, f, indent=2, ensure_ascii=False)

final_count = len(heavy_hitters)
unique_count = len(set(hh_ids))

print(f"  ✓ Saved to sessions_enriched.json")

# Final summary
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"Original heavy hitters: {original_count}")
print(f"New heavy hitters: {final_count} ({unique_count} unique IDs)")
print(f"Change: {final_count - original_count:+d}")
print(f"Time slot overlaps: {len(overlaps)}")
print(f"Date distribution: Feb 16: {len(by_date.get('2026-02-16', []))}, "
      f"Feb 17: {len(by_date.get('2026-02-17', []))}, "
      f"Feb 18: {len(by_date.get('2026-02-18', []))}, "
      f"Feb 19: {len(by_date.get('2026-02-19', []))}, "
      f"Feb 20: {len(by_date.get('2026-02-20', []))}")
print("=" * 70)
