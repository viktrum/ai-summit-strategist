'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import staticEventsData from '@/data/events.json';
import staticExhibitorsData from '@/data/exhibitors.json';
import type { Event, Exhibitor } from '@/lib/types';
import { DATA_VERSION } from '@/lib/data-version';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface DataContextValue {
  events: Event[];
  exhibitors: Exhibitor[];
  dataTimestamp: string;
}

const DataContext = createContext<DataContextValue>({
  events: staticEventsData as Event[],
  exhibitors: staticExhibitorsData as Exhibitor[],
  dataTimestamp: DATA_VERSION,
});

export function useData() {
  return useContext(DataContext);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = 'event-data';
const EVENTS_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/events.json`;
const EXHIBITORS_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/exhibitors.json`;

const CACHE_KEY_EVENTS = 'hotdata_events';
const CACHE_KEY_EXHIBITORS = 'hotdata_exhibitors';
const CACHE_KEY_EV_ETAG = 'hotdata_ev_etag';
const CACHE_KEY_EX_ETAG = 'hotdata_ex_etag';

// ---------------------------------------------------------------------------
// localStorage helpers (graceful degradation on quota exceeded / SSR)
// ---------------------------------------------------------------------------

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* quota exceeded — data works in memory */ }
}

// ---------------------------------------------------------------------------
// Fetch ETag via HEAD request (tiny — no body downloaded)
// ---------------------------------------------------------------------------

async function fetchEtag(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return res.headers.get('etag') || res.headers.get('last-modified');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function DataProvider({ children }: { children: ReactNode }) {
  // Tier 0 + Tier 1: synchronous init — static bundled JSON, upgraded by localStorage if available.
  // Guard: only use cached data if it has >= items than the static bundle.
  // This prevents stale cache (from an old bucket upload) from downgrading the app.
  const [events, setEvents] = useState<Event[]>(() => {
    if (typeof window === 'undefined') return staticEventsData as Event[];
    const cached = lsGet(CACHE_KEY_EVENTS);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= (staticEventsData as Event[]).length) {
          return parsed as Event[];
        }
      } catch { /* fall through */ }
    }
    return staticEventsData as Event[];
  });

  const [exhibitors, setExhibitors] = useState<Exhibitor[]>(() => {
    if (typeof window === 'undefined') return staticExhibitorsData as Exhibitor[];
    const cached = lsGet(CACHE_KEY_EXHIBITORS);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= (staticExhibitorsData as Exhibitor[]).length) {
          return parsed as Exhibitor[];
        }
      } catch { /* fall through */ }
    }
    return staticExhibitorsData as Exhibitor[];
  });

  const [dataTimestamp, setDataTimestamp] = useState<string>(() => {
    if (typeof window === 'undefined') return DATA_VERSION;
    const evEtag = lsGet(CACHE_KEY_EV_ETAG) || '';
    const exEtag = lsGet(CACHE_KEY_EX_ETAG) || '';
    return (evEtag || exEtag) ? `${evEtag}|${exEtag}` : DATA_VERSION;
  });

  const isFetchingRef = useRef(false);

  // Tier 2: async background check via HEAD requests on public URLs
  // Compares ETags — only downloads full JSONs if content changed
  const checkForUpdates = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      // Cheap HEAD requests to get ETags (~200 bytes each)
      const [evEtag, exEtag] = await Promise.all([
        fetchEtag(EVENTS_URL),
        fetchEtag(EXHIBITORS_URL),
      ]);

      if (!evEtag && !exEtag) return; // bucket empty or unreachable

      // Compare each ETag separately — only download what actually changed
      const cachedEvEtag = lsGet(CACHE_KEY_EV_ETAG) || '';
      const cachedExEtag = lsGet(CACHE_KEY_EX_ETAG) || '';
      const evChanged = evEtag && evEtag !== cachedEvEtag;
      const exChanged = exEtag && exEtag !== cachedExEtag;
      if (!evChanged && !exChanged) return; // no changes

      let newEvents: Event[] | null = null;
      let newExhibitors: Exhibitor[] | null = null;

      if (evChanged) {
        const { data } = await supabase.storage.from(BUCKET).download('events.json');
        if (data) {
          try {
            const text = await data.text();
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) newEvents = parsed as Event[];
          } catch { /* invalid JSON — skip */ }
        }
      }

      if (exChanged) {
        const { data } = await supabase.storage.from(BUCKET).download('exhibitors.json');
        if (data) {
          try {
            const text = await data.text();
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) newExhibitors = parsed as Exhibitor[];
          } catch { /* invalid JSON — skip */ }
        }
      }

      // Update state + cache — only save ETag if download succeeded
      if (newEvents) {
        setEvents(newEvents);
        lsSet(CACHE_KEY_EVENTS, JSON.stringify(newEvents));
        lsSet(CACHE_KEY_EV_ETAG, evEtag!);
      }
      if (newExhibitors) {
        setExhibitors(newExhibitors);
        lsSet(CACHE_KEY_EXHIBITORS, JSON.stringify(newExhibitors));
        lsSet(CACHE_KEY_EX_ETAG, exEtag!);
      }
      if (newEvents || newExhibitors) {
        const newFingerprint = `${lsGet(CACHE_KEY_EV_ETAG) || ''}|${lsGet(CACHE_KEY_EX_ETAG) || ''}`;
        setDataTimestamp(newFingerprint);
      }
    } catch {
      // Supabase unreachable — silently fall back to current data
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Check on mount
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  // Check on tab visibility change (user returns to tab)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [checkForUpdates]);

  return (
    <DataContext.Provider value={{ events, exhibitors, dataTimestamp }}>
      {children}
    </DataContext.Provider>
  );
}
