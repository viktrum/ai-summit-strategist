"""
Deduplicate sessions_enriched.json
Removes duplicate event_ids, keeping first occurrence
"""

import json

print("=" * 70)
print("DEDUPLICATING SESSIONS")
print("=" * 70)

# Load data
with open('sessions_enriched.json', 'r', encoding='utf-8') as f:
    sessions = json.load(f)

print(f"\nOriginal count: {len(sessions)} sessions")

# Known duplicate IDs from analysis
known_duplicates = [4638, 5140, 5145, 5159, 5169, 5172, 5190, 5195, 5200, 5207, 5380, 5398, 5418, 5440, 5446, 5460, 5527]

print(f"Known duplicate IDs to check: {len(known_duplicates)}")

# Track seen event_ids
seen_event_ids = set()
seen_ids = set()
clean_sessions = []
removed = []

for session in sessions:
    event_id = session.get('event_id')
    id_num = session.get('id')

    # Check if we've seen this event_id before
    if event_id in seen_event_ids:
        removed.append({
            'id': id_num,
            'event_id': event_id,
            'title': session.get('title', '')[:50]
        })
        continue

    # Check if we've seen this numeric id before
    if id_num in seen_ids:
        removed.append({
            'id': id_num,
            'event_id': event_id,
            'title': session.get('title', '')[:50]
        })
        continue

    # Keep this session
    seen_event_ids.add(event_id)
    seen_ids.add(id_num)
    clean_sessions.append(session)

print(f"\nRemoved {len(removed)} duplicate sessions:")
for dup in removed:
    print(f"  - ID {dup['id']}: {dup['title']}... (event_id: {dup['event_id']})")

print(f"\nFinal count: {len(clean_sessions)} sessions")
print(f"Reduction: {len(sessions) - len(clean_sessions)} sessions removed")

# Verify all known duplicates were handled
remaining_ids = [s['id'] for s in clean_sessions]
still_duplicated = []
for dup_id in known_duplicates:
    count = remaining_ids.count(dup_id)
    if count > 1:
        still_duplicated.append((dup_id, count))

if still_duplicated:
    print(f"\n⚠️  WARNING: {len(still_duplicated)} IDs still have duplicates:")
    for dup_id, count in still_duplicated:
        print(f"  - ID {dup_id}: appears {count} times")
else:
    print(f"\n✓ All known duplicates resolved")

# Check heavy hitter count
hh_count = sum(1 for s in clean_sessions if s['networking_signals']['is_heavy_hitter'])
print(f"\nHeavy hitters in clean data: {hh_count}")

# Save clean data
with open('sessions_enriched_clean.json', 'w', encoding='utf-8') as f:
    json.dump(clean_sessions, f, indent=2, ensure_ascii=False)

print(f"\n✓ Saved to: sessions_enriched_clean.json")

# Backup original
import shutil
shutil.copy('sessions_enriched.json', 'sessions_enriched_backup.json')
print(f"✓ Backed up original to: sessions_enriched_backup.json")

print("\n" + "=" * 70)
print("DEDUPE COMPLETE")
print("=" * 70)
print(f"Original: {len(sessions)} sessions")
print(f"Clean: {len(clean_sessions)} sessions")
print(f"Removed: {len(removed)} duplicates")
print(f"Heavy hitters: {hh_count}")
print("=" * 70)
