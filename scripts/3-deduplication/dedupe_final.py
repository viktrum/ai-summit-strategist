"""
Final Deduplication Script
Uses numeric 'id' field as primary key
Keeps first occurrence, removes duplicates
"""

import json
import shutil
from datetime import datetime

print("=" * 70)
print("RUNNING DEDUPLICATION")
print("=" * 70)

# Create backup first
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_file = f'sessions_enriched_backup_{timestamp}.json'

print(f"\n1. Creating backup...")
shutil.copy('sessions_enriched.json', backup_file)
print(f"   ✓ Backup saved: {backup_file}")

# Load original data
print(f"\n2. Loading original data...")
with open('sessions_enriched.json', 'r', encoding='utf-8') as f:
    sessions = json.load(f)
print(f"   ✓ Loaded {len(sessions)} sessions")

# Deduplicate
print(f"\n3. Deduplicating by 'id' field...")
seen_ids = set()
clean_sessions = []
removed = []

for session in sessions:
    session_id = session.get('id')

    if session_id in seen_ids:
        removed.append({
            'id': session_id,
            'title': session.get('title', '')[:50]
        })
        continue

    seen_ids.add(session_id)
    clean_sessions.append(session)

print(f"   ✓ Removed {len(removed)} duplicates")
print(f"   ✓ Kept {len(clean_sessions)} unique sessions")

# Show what was removed
if removed:
    print(f"\n4. Removed duplicates:")
    for dup in removed:
        print(f"   - ID {dup['id']}: {dup['title']}...")

# Verify heavy hitters are intact
hh_count = sum(1 for s in clean_sessions if s.get('networking_signals', {}).get('is_heavy_hitter'))
print(f"\n5. Heavy hitter check:")
print(f"   ✓ Heavy hitters in clean data: {hh_count}")

# Save clean data
output_file = 'sessions_enriched_clean.json'
print(f"\n6. Saving clean data...")
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(clean_sessions, f, indent=2, ensure_ascii=False)
print(f"   ✓ Saved to: {output_file}")

# Summary
print("\n" + "=" * 70)
print("DEDUPLICATION COMPLETE")
print("=" * 70)
print(f"Original: {len(sessions)} sessions")
print(f"Clean: {len(clean_sessions)} sessions")
print(f"Removed: {len(removed)} duplicates")
print(f"Heavy hitters: {hh_count}")
print(f"\nFiles:")
print(f"  - Original backup: {backup_file}")
print(f"  - Clean data: {output_file}")
print("=" * 70)
