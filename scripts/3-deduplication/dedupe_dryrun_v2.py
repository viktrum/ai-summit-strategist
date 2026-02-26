"""
DRY RUN Deduplication Analysis v2
Uses numeric 'id' field as the primary deduplication key
Shows what WOULD be deleted without actually deleting anything
"""

import json
from collections import defaultdict

print("=" * 70)
print("DEDUPE DRY RUN v2 - Using 'id' field (NO FILES MODIFIED)")
print("=" * 70)

# Load original data
with open('sessions_enriched.json', 'r', encoding='utf-8') as f:
    sessions = json.load(f)

print(f"\nTotal sessions in file: {len(sessions)}")

# Group by numeric ID to find duplicates
by_id = defaultdict(list)

for idx, session in enumerate(sessions):
    session_id = session.get('id')
    by_id[session_id].append((idx, session))

# Find duplicate IDs
duplicate_ids = {k: v for k, v in by_id.items() if len(v) > 1}

print(f"\nDuplicate Analysis:")
print(f"  - Numeric IDs appearing more than once: {len(duplicate_ids)}")
print(f"  - Total duplicate entries: {sum(len(v) - 1 for v in duplicate_ids.values())}")

# Calculate what would be deleted
would_delete = []
seen_ids = set()

for idx, session in enumerate(sessions):
    session_id = session.get('id')

    # Check if we've seen this ID before
    if session_id in seen_ids:
        would_delete.append({
            'index': idx,
            'id': session_id,
            'event_id': session.get('event_id'),
            'title': session.get('title', '')[:60],
            'date': session.get('date'),
            'start_time': session.get('start_time', '')[:5],
            'speakers': session.get('speakers', '')[:50],
        })
        continue

    seen_ids.add(session_id)

print(f"\nWould delete: {len(would_delete)} duplicate sessions")
print(f"Would keep: {len(sessions) - len(would_delete)} unique sessions")

# Show first TWO examples with full details
print("\n" + "=" * 70)
print("FIRST TWO EXAMPLES OF WHAT WOULD BE DELETED:")
print("=" * 70)

for i, dup in enumerate(would_delete[:2]):
    print(f"\n{'='*70}")
    print(f"EXAMPLE #{i+1} - DUPLICATE TO DELETE")
    print(f"{'='*70}")

    # Get the full session data for the duplicate
    dup_session = sessions[dup['index']]

    print(f"ID: {dup['id']}")
    print(f"Event ID: {dup['event_id']}")
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

    # Find what we're keeping (first occurrence with same ID)
    print(f"\n{'='*70}")
    print(f"ORIGINAL (that we're KEEPING):")
    print(f"{'='*70}")

    kept_session = None
    for s in sessions:
        if s.get('id') == dup['id']:
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

        # Are they actually identical?
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
        print(f"  Are these identical? {identical}")

        if not identical:
            print(f"  🚨 WARNING: These have the same ID but different content!")
            print(f"\n  Differences:")
            if kept_session.get('title') != dup_session.get('title'):
                print(f"    - Title differs")
            if kept_session.get('date') != dup_session.get('date'):
                print(f"    - Date differs")
            if kept_session.get('speakers') != dup_session.get('speakers'):
                print(f"    - Speakers differ")
        else:
            print(f"  ✅ These are exact duplicates - safe to delete")

print("\n" + "=" * 70)
print("ALL DUPLICATE IDs FOUND:")
print("=" * 70)
for dup_id, occurrences in sorted(duplicate_ids.items()):
    print(f"  ID {dup_id}: appears {len(occurrences)} times")

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"Total sessions: {len(sessions)}")
print(f"Unique IDs: {len(by_id)}")
print(f"Would delete: {len(would_delete)} duplicates")
print(f"Would keep: {len(sessions) - len(would_delete)} unique sessions")
print("\n⚠️  NO FILES WERE MODIFIED - This was a dry run only")
print("=" * 70)
