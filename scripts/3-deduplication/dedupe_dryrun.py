"""
DRY RUN Deduplication Analysis
Shows what WOULD be deleted without actually deleting anything
"""

import json
from collections import defaultdict

print("=" * 70)
print("DEDUPE DRY RUN - ANALYSIS ONLY (NO FILES MODIFIED)")
print("=" * 70)

# Load original data
with open('sessions_enriched.json', 'r', encoding='utf-8') as f:
    sessions = json.load(f)

print(f"\nTotal sessions in file: {len(sessions)}")

# Group by event_id to find duplicates
by_event_id = defaultdict(list)
by_numeric_id = defaultdict(list)

for idx, session in enumerate(sessions):
    event_id = session.get('event_id')
    numeric_id = session.get('id')

    by_event_id[event_id].append((idx, session))
    by_numeric_id[numeric_id].append((idx, session))

# Find duplicate event_ids
duplicate_event_ids = {k: v for k, v in by_event_id.items() if len(v) > 1 and k is not None}
duplicate_numeric_ids = {k: v for k, v in by_numeric_id.items() if len(v) > 1}

print(f"\nDuplicate Analysis:")
print(f"  - Event IDs appearing more than once: {len(duplicate_event_ids)}")
print(f"  - Numeric IDs appearing more than once: {len(duplicate_numeric_ids)}")
print(f"  - Events with event_id = None: {len(by_event_id.get(None, []))}")

# Calculate what would be deleted
would_delete = []

# Strategy: Keep first occurrence, mark rest for deletion
seen_event_ids = set()
seen_numeric_ids = set()

for idx, session in enumerate(sessions):
    event_id = session.get('event_id')
    numeric_id = session.get('id')

    # Skip if event_id is None (can't dedupe these safely)
    if event_id is None:
        continue

    # Check if we've seen this event_id before
    if event_id in seen_event_ids:
        would_delete.append({
            'index': idx,
            'id': numeric_id,
            'event_id': event_id,
            'title': session.get('title', '')[:60],
            'date': session.get('date'),
            'start_time': session.get('start_time', '')[:5],
            'speakers': session.get('speakers', '')[:50],
            'reason': 'Duplicate event_id'
        })
        continue

    # Check if we've seen this numeric_id before
    if numeric_id in seen_numeric_ids:
        would_delete.append({
            'index': idx,
            'id': numeric_id,
            'event_id': event_id,
            'title': session.get('title', '')[:60],
            'date': session.get('date'),
            'start_time': session.get('start_time', '')[:5],
            'speakers': session.get('speakers', '')[:50],
            'reason': 'Duplicate numeric ID'
        })
        continue

    seen_event_ids.add(event_id)
    seen_numeric_ids.add(numeric_id)

print(f"\nWould delete: {len(would_delete)} sessions")
print(f"Would keep: {len(sessions) - len(would_delete)} sessions")

# Show first TWO examples with full details
print("\n" + "=" * 70)
print("FIRST TWO EXAMPLES OF WHAT WOULD BE DELETED:")
print("=" * 70)

for i, dup in enumerate(would_delete[:2]):
    print(f"\n{'='*70}")
    print(f"EXAMPLE #{i+1}")
    print(f"{'='*70}")

    # Get the full session data
    session = sessions[dup['index']]

    print(f"Numeric ID: {dup['id']}")
    print(f"Event ID: {dup['event_id']}")
    print(f"Reason: {dup['reason']}")
    print(f"\nFull Details:")
    print(f"  Title: {session.get('title')}")
    print(f"  Date: {session.get('date')} at {session.get('start_time')}")
    print(f"  Venue: {session.get('venue')}")
    print(f"  Room: {session.get('room')}")
    print(f"  Speakers: {session.get('speakers')}")
    print(f"  Knowledge Partners: {session.get('knowledge_partners')}")
    print(f"  Technical Depth: {session.get('technical_depth')}")
    print(f"  Is Heavy Hitter: {session.get('networking_signals', {}).get('is_heavy_hitter')}")

    # Find what we're keeping instead
    print(f"\nWHAT WE'RE KEEPING (First occurrence with same ID):")
    kept_session = None
    if dup['reason'] == 'Duplicate event_id':
        # Find first occurrence with this event_id
        for s in sessions:
            if s.get('event_id') == dup['event_id']:
                kept_session = s
                break
    else:
        # Find first occurrence with this numeric_id
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
        print(f"  Technical Depth: {kept_session.get('technical_depth')}")
        print(f"  Is Heavy Hitter: {kept_session.get('networking_signals', {}).get('is_heavy_hitter')}")

    # Are they actually identical?
    if kept_session:
        identical = (
            kept_session.get('title') == session.get('title') and
            kept_session.get('date') == session.get('date') and
            kept_session.get('start_time') == session.get('start_time') and
            kept_session.get('speakers') == session.get('speakers')
        )
        print(f"\n  ⚠️ Are these identical events? {identical}")
        if not identical:
            print(f"  🚨 WARNING: These appear to be DIFFERENT events with the same ID!")

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"Total sessions: {len(sessions)}")
print(f"Would delete: {len(would_delete)}")
print(f"Would keep: {len(sessions) - len(would_delete)}")
print(f"Events with event_id=None: {len(by_event_id.get(None, []))} (NOT deleted - can't dedupe safely)")
print("\n⚠️  NO FILES WERE MODIFIED - This was a dry run only")
print("=" * 70)
