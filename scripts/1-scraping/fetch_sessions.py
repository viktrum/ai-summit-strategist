"""
Fetches all session data from the India AI Impact Summit 2026 API
and saves it as both JSON and CSV files.
"""

import urllib.request
import urllib.parse
import json
import csv
import time
import ssl
import os

BASE_URL = "https://cms-uatimpact.indiaai.in/api/session-cards"
PAGE_SIZE = 25
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Allow unverified SSL (some environments need this)
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE


def build_url(page: int) -> str:
    params = {
        "sort[0]": "date:asc",
        "sort[1]": "startTime:asc",
        "populate[cards]": "*",
        "populate[Buttons]": "*",
        "pagination[page]": str(page),
        "pagination[pageSize]": str(PAGE_SIZE),
    }
    return f"{BASE_URL}?{urllib.parse.urlencode(params)}"


def fetch_page(page: int, retries: int = 3) -> dict:
    """Fetch a single page with retry logic."""
    url = build_url(page)
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://impact.indiaai.gov.in/",
            })
            with urllib.request.urlopen(req, timeout=30, context=ssl_ctx) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data
        except Exception as e:
            print(f"  Attempt {attempt + 1}/{retries} for page {page} failed: {e}")
            if attempt < retries - 1:
                time.sleep(2 * (attempt + 1))  # exponential backoff
    return None


def extract_session(item: dict) -> dict:
    """Extract a flat session record from the API response item."""
    speakers = [s.get("heading", "") for s in item.get("speakers", [])]
    knowledge_partners = [kp.get("title", "") for kp in item.get("knowledgePartners", [])]
    session_type_obj = item.get("sessionType") or {}

    return {
        "id": item.get("id"),
        "title": (item.get("title") or "").strip(),
        "description": (item.get("description") or "").strip(),
        "date": item.get("date"),
        "start_time": item.get("startTime"),
        "end_time": item.get("endTime"),
        "venue": item.get("venue"),
        "room": item.get("room"),
        "speakers": "; ".join(speakers),
        "knowledge_partners": "; ".join(knowledge_partners),
        "session_type": session_type_obj.get("displayLabel", ""),
        "event_id": item.get("eventID"),
        "add_to_calendar": item.get("addToCalendar"),
        "notes": item.get("notes"),
    }


def main():
    print("=" * 60)
    print("India AI Impact Summit 2026 - Session Data Fetcher")
    print("=" * 60)

    # Step 1: Determine total pages
    print("\nFetching page 1 to determine total sessions...")
    first_page = fetch_page(1)
    if not first_page:
        print("ERROR: Could not fetch first page. Exiting.")
        return

    meta = first_page.get("meta", {}).get("pagination", {})
    total = meta.get("total", 0)
    page_count = meta.get("pageCount", 0)
    print(f"Total sessions: {total}")
    print(f"Total pages: {page_count} (page size: {PAGE_SIZE})")

    # Step 2: Collect all sessions
    all_sessions = []
    failed_pages = []

    # Process page 1 data
    for item in first_page.get("data", []):
        all_sessions.append(extract_session(item))
    print(f"Page 1: fetched {len(first_page.get('data', []))} sessions")

    # Fetch remaining pages
    for page in range(2, page_count + 1):
        print(f"Fetching page {page}/{page_count}...", end=" ")
        result = fetch_page(page)
        if result and "data" in result:
            count = len(result["data"])
            for item in result["data"]:
                all_sessions.append(extract_session(item))
            print(f"OK ({count} sessions)")
        else:
            failed_pages.append(page)
            print("FAILED")
        time.sleep(0.5)  # Be polite to the server

    print(f"\nTotal sessions fetched: {len(all_sessions)}")
    if failed_pages:
        print(f"Failed pages: {failed_pages}")

    # Step 3: Save as JSON
    json_path = os.path.join(OUTPUT_DIR, "sessions.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_sessions, f, indent=2, ensure_ascii=False)
    print(f"\nSaved JSON: {json_path}")

    # Step 4: Save as CSV
    csv_path = os.path.join(OUTPUT_DIR, "sessions.csv")
    if all_sessions:
        fieldnames = all_sessions[0].keys()
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_sessions)
        print(f"Saved CSV: {csv_path}")

    # Step 5: Print summary by date
    print("\n" + "=" * 60)
    print("SESSIONS BY DATE:")
    print("=" * 60)
    from collections import Counter
    date_counts = Counter(s["date"] for s in all_sessions)
    for date, count in sorted(date_counts.items()):
        print(f"  {date}: {count} sessions")

    print("\n" + "=" * 60)
    print("SESSIONS BY VENUE:")
    print("=" * 60)
    venue_counts = Counter(s["venue"] for s in all_sessions if s["venue"])
    for venue, count in sorted(venue_counts.items(), key=lambda x: -x[1]):
        print(f"  {venue}: {count} sessions")

    print(f"\nDone! Check {json_path} and {csv_path}")


if __name__ == "__main__":
    main()
