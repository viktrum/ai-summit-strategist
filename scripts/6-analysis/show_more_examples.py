"""
Show examples 3 and 4 of duplicates
"""

import json
from collections import defaultdict

# Load original data
with open('sessions_enriched.json', 'r', encoding='utf-8') as f:
    sessions = json.load(f)

# Find duplicates using ID field
would_delete = []
seen_ids = set()

for idx, session in enumerate(sessions):
    session_id = session.get('id')

    if session_id in seen_ids:
        would_delete.append({
            'index': idx,
            'session': session
        })
        continue

    seen_ids.add(session_id)

print("=" * 70)
print("EXAMPLES 3 & 4 OF DUPLICATES TO DELETE")
print("=" * 70)

# Show examples 3 and 4 (indices 2 and 3)
for i, dup in enumerate(would_delete[2:4], start=3):
    print(f"\n{'='*70}")
    print(f"EXAMPLE #{i} - DUPLICATE TO DELETE")
    print(f"{'='*70}")

    dup_session = dup['session']
    session_id = dup_session.get('id')

    print(f"ID: {session_id}")
    print(f"Event ID: {dup_session.get('event_id')}")
    print(f"\nFull Details of DUPLICATE (to be deleted):")
    print(f"  Title: {dup_session.get('title')}")
    print(f"  Date: {dup_session.get('date')} at {dup_session.get('start_time')}")
    print(f"  Venue: {dup_session.get('venue')}")
    print(f"  Room: {dup_session.get('room')}")
    print(f"  Speakers: {dup_session.get('speakers')}")
    print(f"  Knowledge Partners: {dup_session.get('knowledge_partners')}")
    print(f"  Technical Depth: {dup_session.get('technical_depth')}")
    print(f"  Summary: {dup_session.get('summary_one_liner')}")
    print(f"  Is Heavy Hitter: {dup_session.get('networking_signals', {}).get('is_heavy_hitter')}")

    # Find what we're keeping
    print(f"\n{'='*70}")
    print(f"ORIGINAL (that we're KEEPING):")
    print(f"{'='*70}")

    kept_session = None
    for s in sessions:
        if s.get('id') == session_id:
            kept_session = s
            break

    if kept_session:
        print(f"  Title: {kept_session.get('title')}")
        print(f"  Date: {kept_session.get('date')} at {kept_session.get('start_time')}")
        print(f"  Venue: {kept_session.get('venue')}")
        print(f"  Room: {kept_session.get('room')}")
        print(f"  Speakers: {kept_session.get('speakers')}")
        print(f"  Knowledge Partners: {kept_session.get('knowledge_partners')}")
        print(f"  Technical Depth: {kept_session.get('technical_depth')}")
        print(f"  Summary: {kept_session.get('summary_one_liner')}")
        print(f"  Is Heavy Hitter: {kept_session.get('networking_signals', {}).get('is_heavy_hitter')}")

        # Check if identical
        identical = (
            kept_session.get('title') == dup_session.get('title') and
            kept_session.get('date') == dup_session.get('date') and
            kept_session.get('start_time') == dup_session.get('start_time') and
            kept_session.get('speakers') == dup_session.get('speakers') and
            kept_session.get('description') == dup_session.get('description')
        )

        print(f"\n{'='*70}")
        print(f"COMPARISON:")
        print(f"{'='*70}")
        if identical:
            print(f"  ✅ These are exact duplicates - SAFE TO DELETE")
        else:
            print(f"  🚨 WARNING: Same ID but different content!")

print("\n" + "=" * 70)
