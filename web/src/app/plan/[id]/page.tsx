'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Share2, ArrowLeft, CalendarDays, X, Flame, Clock, MapPin, Users, MessageCircle, Lightbulb, ArrowLeftRight, FileDown, RotateCcw, Building2, Link2, Bookmark, Download, Sparkles } from 'lucide-react';
import { TimeSlotRow } from '@/components/results/TimeSlotRow';
import { ExhibitorCard } from '@/components/results/ExhibitorCard';
import { TIER_STYLES } from '@/lib/tier-styles';
import type { RecommendationPlan, Tier, ScoredEvent, PlanEdits, SavedPlanEvent, Event, Exhibitor, AlternativeEvent, DaySchedule } from '@/lib/types';
import { isEventPast, getCurrentDateIST } from '@/lib/time-utils';
import { formatTime, formatDateLong as formatDate, dayShort, dayNum, parseSpeakers } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { getEnrichedLogos } from '@/lib/logo-lookup';
import eventsData from '@/data/events.json';
import exhibitorsData from '@/data/exhibitors.json';

// ---------------------------------------------------------------------------
// Hydrate a full RecommendationPlan from slim Supabase data + static JSON
// ---------------------------------------------------------------------------

const ALL_EVENTS = eventsData as Event[];
const EVENT_MAP = new Map(ALL_EVENTS.map((e) => [e.id, e]));
const EXHIBITOR_MAP = new Map((exhibitorsData as Exhibitor[]).map((e) => [e.id, e]));

// ---------------------------------------------------------------------------
// Time overlap utility (mirrors scoring.ts logic)
// ---------------------------------------------------------------------------

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function timesOverlap(
  startA: string, endA: string | null,
  startB: string, endB: string | null,
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = endA ? timeToMinutes(endA) : aStart + 30;
  const bStart = timeToMinutes(startB);
  const bEnd = endB ? timeToMinutes(endB) : bStart + 30;
  return aStart < bEnd && bStart < aEnd;
}

// ---------------------------------------------------------------------------
// Enrich plan events with alternatives from static JSON
// (needed when alternatives weren't preserved, e.g. Supabase-hydrated plans)
// ---------------------------------------------------------------------------

function enrichWithAlternatives(schedule: DaySchedule[]): void {
  for (const day of schedule) {
    const primaries = day.events.filter((e) => !e.isFallback);

    for (const primary of primaries) {
      // Skip if already has alternatives (e.g. loaded from localStorage)
      if (primary.alternatives && primary.alternatives.length > 0) continue;

      // Find all events on the same date that overlap with this primary
      const overlapping = ALL_EVENTS.filter(
        (ev) =>
          ev.date === primary.event.date &&
          ev.event_id !== primary.event.event_id &&
          timesOverlap(primary.event.start_time, primary.event.end_time, ev.start_time, ev.end_time)
      );

      // Sort: heavy hitters first, then by title
      overlapping.sort((a, b) => {
        if (a.networking_signals.is_heavy_hitter !== b.networking_signals.is_heavy_hitter) {
          return a.networking_signals.is_heavy_hitter ? -1 : 1;
        }
        return a.title.localeCompare(b.title);
      });

      primary.alternatives = overlapping.slice(0, 10).map((ev): AlternativeEvent => ({
        event_id: ev.event_id,
        title: ev.title,
        tier: 'Wildcard',
        score: 0,
        venue: ev.venue,
        room: ev.room,
        one_liner: ev.summary_one_liner,
        start_time: ev.start_time,
        end_time: ev.end_time,
        speakers: ev.speakers,
        is_heavy_hitter: ev.networking_signals.is_heavy_hitter,
      }));
    }
  }
}

function hydratePlan(
  headline: string,
  strategyNote: string,
  savedEvents: SavedPlanEvent[],
  exhibitorIds: number[],
): RecommendationPlan {
  // Group events by date
  const dateMap = new Map<string, ScoredEvent[]>();

  // Build an id→event_id lookup for fallback_for resolution
  const idToEventId = new Map(savedEvents.map((se) => {
    const ev = EVENT_MAP.get(se.id);
    return [se.id, ev?.event_id || ''] as const;
  }));

  for (const se of savedEvents) {
    const event = EVENT_MAP.get(se.id);
    if (!event) continue;

    const scored: ScoredEvent = {
      event,
      score: se.score,
      tier: se.tier,
      isFallback: se.is_fallback,
      fallbackFor: se.fallback_for ? (idToEventId.get(se.fallback_for) || undefined) : undefined,
      isManual: se.is_manual || false,
      breakdown: {
        keywordScore: 0,
        personaScore: 0,
        depthScore: 0,
        heavyHitterBonus: 0,
        goalRelevanceScore: 0,
        networkingSignalScore: 0,
        sectorScore: 0,
        dealBreakerPenalty: 0,
      },
    };

    const date = event.date;
    if (!dateMap.has(date)) dateMap.set(date, []);
    dateMap.get(date)!.push(scored);
  }

  // Sort dates and events within each date
  const schedule = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, events]) => ({
      date,
      events: events.sort((a, b) =>
        (a.event.start_time || '').localeCompare(b.event.start_time || '')
      ),
    }));

  // Hydrate exhibitors
  const exhibitors = exhibitorIds
    .map((id) => {
      const exhibitor = EXHIBITOR_MAP.get(id);
      if (!exhibitor) return null;
      return {
        exhibitor,
        score: 0,
        breakdown: { keywordScore: 0, personaScore: 0 },
      };
    })
    .filter(Boolean) as RecommendationPlan['exhibitors'];

  const totalEvents = schedule.reduce(
    (acc, day) => acc + day.events.filter((e) => !e.isFallback).length,
    0
  );

  return {
    headline,
    strategyNote,
    schedule,
    exhibitors,
    totalEvents,
    profile: { role: 'founder', focusAreas: [], missions: [], availableDates: [], technicalDepthPreference: 3, keywordInterests: [], personaInterests: [] },
  };
}

// ---------------------------------------------------------------------------
// Score breakdown component (used in detail sheet)
// ---------------------------------------------------------------------------

function ScoreBreakdown({ breakdown }: { breakdown: ScoredEvent['breakdown'] }) {
  const items = [
    { label: 'Keyword Match', value: breakdown.keywordScore, max: 20 },
    { label: 'Persona Match', value: breakdown.personaScore, max: 20 },
    { label: 'Goal Relevance', value: breakdown.goalRelevanceScore ?? 0, max: 15 },
    { label: 'Networking', value: breakdown.networkingSignalScore ?? 0, max: 15 },
    { label: 'Tech Depth', value: breakdown.depthScore, max: 10 },
    { label: 'Sector Match', value: breakdown.sectorScore ?? 0, max: 10 },
    { label: 'Seniority', value: (breakdown as Record<string, number>).speakerSeniorityScore ?? 0, max: 10 },
  ].filter((item) => item.max > 0);

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = (item.value / item.max) * 100;
        const barColor =
          pct >= 80 ? 'bg-[#059669]' : pct >= 50 ? 'bg-[#D97706]' : 'bg-[#8A8A87]';
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-[90px] shrink-0 text-xs text-[#A8A29E]">{item.label}</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#F0EFED]">
              <div
                className={`score-bar-fill h-full rounded-full ${barColor} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-[family-name:var(--font-mono)] text-xs text-[#A8A29E]">
              {item.value}/{item.max}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<RecommendationPlan | null>(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [planEdits, setPlanEdits] = useState<PlanEdits>({ pinned: [], dismissed: [], swapped: {} });
  const [swapTarget, setSwapTarget] = useState<ScoredEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<ScoredEvent | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null); // null = show all
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveCopied, setSaveCopied] = useState(false);
  const [isNewVisitor, setIsNewVisitor] = useState(false);
  const [stripDismissed, setStripDismissed] = useState(false);
  const searchParams = useSearchParams();
  const simulateTime = searchParams.get('simulateTime');
  const hasScrolledRef = useRef(false);
  const pendingScrollRef = useRef<string | null>(null);

  // Load plan
  useEffect(() => {
    async function loadPlan() {
      // Try reading user_name from quiz answers in localStorage
      try {
        const quizRaw = localStorage.getItem('quizAnswers');
        if (quizRaw) {
          const qa = JSON.parse(quizRaw);
          if (qa.user_name) setUserName(qa.user_name);
        }
      } catch { /* ignore */ }

      if (params.id === 'local') {
        try {
          const stored = localStorage.getItem('planResult');
          if (stored) {
            const loadedPlan = JSON.parse(stored) as RecommendationPlan;
            setPlan(loadedPlan);
            // Default to first day
            if (loadedPlan.schedule.length > 0) {
              setActiveDay(loadedPlan.schedule[0].date);
            }
          } else {
            router.push('/');
            return;
          }
        } catch {
          router.push('/');
          return;
        }
        try {
          const editsRaw = localStorage.getItem('planEdits');
          if (editsRaw) setPlanEdits(JSON.parse(editsRaw) as PlanEdits);
        } catch { /* ignore */ }
      } else {
        // Check if the current user owns this plan (localStorage lastPlanId matches)
        const lastPlanId = localStorage.getItem('lastPlanId');
        const isOwner = lastPlanId === params.id;

        if (isOwner) {
          // Plan owner: use localStorage (has full data with alternatives)
          let loaded = false;
          const stored = localStorage.getItem('planResult');
          if (stored) {
            try {
              const loadedPlan = JSON.parse(stored) as RecommendationPlan;
              // Ensure alternatives exist (in case localStorage was saved before enrichment)
              enrichWithAlternatives(loadedPlan.schedule);
              setPlan(loadedPlan);
              if (loadedPlan.schedule.length > 0) {
                setActiveDay(loadedPlan.schedule[0].date);
              }
              loaded = true;
            } catch { /* fall through to Supabase */ }
          }

          if (loaded) {
            // Only fetch user_name from Supabase (don't overwrite plan)
            try {
              const { data } = await supabase
                .from('user_plans')
                .select('user_name')
                .eq('id', params.id)
                .single();
              if (data?.user_name) setUserName(data.user_name);
            } catch { /* ignore */ }
          } else {
            // localStorage didn't have the plan, fall back to Supabase
            try {
              const { data, error } = await supabase
                .from('user_plans')
                .select('headline, strategy_note, events, exhibitor_ids, user_name')
                .eq('id', params.id)
                .single();

              if (!error && data) {
                const hydrated = hydratePlan(
                  data.headline,
                  data.strategy_note,
                  data.events as SavedPlanEvent[],
                  data.exhibitor_ids as number[],
                );
                enrichWithAlternatives(hydrated.schedule);
                setPlan(hydrated);
                if (hydrated.schedule.length > 0) {
                  setActiveDay(hydrated.schedule[0].date);
                }
                if (data.user_name) setUserName(data.user_name);
              } else {
                router.push('/');
                return;
              }
            } catch {
              router.push('/');
              return;
            }
          }
        } else {
          // Shared plan: fetch from Supabase and enrich with alternatives
          try {
            const { data, error } = await supabase
              .from('user_plans')
              .select('headline, strategy_note, events, exhibitor_ids, user_name')
              .eq('id', params.id)
              .single();

            if (!error && data) {
              const hydrated = hydratePlan(
                data.headline,
                data.strategy_note,
                data.events as SavedPlanEvent[],
                data.exhibitor_ids as number[],
              );
              enrichWithAlternatives(hydrated.schedule);
              setPlan(hydrated);
              if (hydrated.schedule.length > 0) {
                setActiveDay(hydrated.schedule[0].date);
              }
              if (data.user_name) setUserName(data.user_name);
            } else {
              router.push('/');
              return;
            }
          } catch {
            router.push('/');
            return;
          }
        }
      }
      setLoading(false);
    }
    loadPlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  // Detect new visitor (no cached plan = likely a friend viewing shared link)
  useEffect(() => {
    if (loading || !plan || params.id === 'local') return;
    try {
      const lastPlanId = localStorage.getItem('lastPlanId');
      if (!lastPlanId) {
        setIsNewVisitor(true);
      }
    } catch { /* ignore */ }
  }, [loading, plan, params.id]);

  // Show "Save Your Plan" modal once after plan first loads from generation
  useEffect(() => {
    if (loading || !plan) return;
    try {
      const shouldShow = sessionStorage.getItem('showSaveModal');
      if (shouldShow === '1') {
        sessionStorage.removeItem('showSaveModal');
        // Small delay so the plan renders first
        setTimeout(() => setShowSaveModal(true), 800);
      }
    } catch { /* ignore */ }
  }, [loading, plan]);

  // Reset scroll state when simulateTime changes (dev testing)
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [simulateTime]);

  // Auto-scroll to the first non-past event on mount (or simulateTime change)
  useEffect(() => {
    if (loading || !plan || hasScrolledRef.current) return;
    hasScrolledRef.current = true;

    // Find the first non-past event across all days
    for (const day of plan.schedule) {
      for (const se of day.events) {
        if (se.isFallback) continue;
        if (!isEventPast(se.event.date, se.event.start_time, se.event.end_time)) {
          const targetId = se.event.event_id;
          const needsDaySwitch = activeDay !== se.event.date;

          if (needsDaySwitch) {
            // Day tab needs to change — queue scroll for after render
            pendingScrollRef.current = targetId;
            setActiveDay(se.event.date);
          } else {
            // Already on the right day — scroll directly
            requestAnimationFrame(() => {
              setTimeout(() => {
                const el = document.querySelector(`[data-event-id="${targetId}"]`);
                if (el) {
                  const rect = el.getBoundingClientRect();
                  const offset = 120;
                  window.scrollBy({ top: rect.top - offset, behavior: 'smooth' });
                }
              }, 100);
            });
          }
          return;
        }
      }
    }
  }, [loading, plan, simulateTime, activeDay]);

  // Execute pending scroll after activeDay change renders the target events
  useEffect(() => {
    if (!pendingScrollRef.current) return;
    const targetId = pendingScrollRef.current;
    pendingScrollRef.current = null;

    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.querySelector(`[data-event-id="${targetId}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const offset = 120;
          window.scrollBy({ top: rect.top - offset, behavior: 'smooth' });
        }
      }, 100);
    });
  }, [activeDay]);

  async function copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  async function handleShare() {
    await copyToClipboard(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveModalCopy() {
    await copyToClipboard(window.location.href);
    setSaveCopied(true);
    setTimeout(() => setSaveCopied(false), 2000);
  }

  function handleWhatsAppShare() {
    const text = `Check out my personalised AI Summit 2026 strategy: ${window.location.href}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // -----------------------------------------------------------------------
  // Persist edits to localStorage + Supabase
  // -----------------------------------------------------------------------

  function persistEdits(edits: PlanEdits) {
    localStorage.setItem('planEdits', JSON.stringify(edits));

    // Sync to Supabase: rebuild slim event list from current plan + edits
    if (params.id !== 'local' && plan) {
      const eidToId = new Map(
        plan.schedule.flatMap((d) => d.events.map((se) => [se.event.event_id, se.event.id]))
      );

      const slimEvents: SavedPlanEvent[] = plan.schedule.flatMap((day) =>
        day.events.map((se) => ({
          id: se.event.id,
          tier: se.tier,
          score: se.score,
          pinned: false,
          is_fallback: se.isFallback,
          fallback_for: se.fallbackFor ? (eidToId.get(se.fallbackFor) ?? null) : null,
        }))
      );

      supabase
        .from('user_plans')
        .update({ events: slimEvents })
        .eq('id', params.id)
        .then(({ error }) => {
          if (error) console.warn('Failed to sync edits:', error.message);
        });
    }
  }

  // -----------------------------------------------------------------------
  // Swap handlers
  // -----------------------------------------------------------------------

  function handleViewAll(eventId: string) {
    if (!plan) return;
    for (const day of plan.schedule) {
      const event = day.events.find((e) => e.event.event_id === eventId);
      if (event) {
        setSwapTarget(event);
        return;
      }
    }
  }

  function handleSwapSelect(newEventId: string) {
    if (!swapTarget) return;
    const slotKey = `${swapTarget.event.date}T${swapTarget.event.start_time}`;
    setPlanEdits((prev) => {
      const updated = {
        ...prev,
        swapped: { ...prev.swapped, [slotKey]: newEventId },
      };
      persistEdits(updated);
      return updated;
    });
    setSwapTarget(null);
  }

  // -----------------------------------------------------------------------
  // ICS Calendar Export
  // -----------------------------------------------------------------------

  function generateICS(): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AI Impact Summit Planner//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Kolkata',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:+0530',
      'TZOFFSETTO:+0530',
      'TZNAME:IST',
      'END:STANDARD',
      'END:VTIMEZONE',
    ];

    for (const day of plan!.schedule) {
      for (const se of day.events) {
        if (se.isFallback) continue;

        const e = se.event;
        const startDate = e.date.replace(/-/g, '');
        const [sh, sm] = e.start_time.split(':');
        const dtStart = `${startDate}T${sh}${sm}00`;

        let dtEnd: string;
        if (e.end_time) {
          const [eh, em] = e.end_time.split(':');
          dtEnd = `${startDate}T${eh}${em}00`;
        } else {
          const endHour = (parseInt(sh) + 1).toString().padStart(2, '0');
          dtEnd = `${startDate}T${endHour}${sm}00`;
        }

        const desc = [
          e.summary_one_liner,
          e.speakers ? `Speakers: ${e.speakers}` : '',
          e.networking_tip ? `Strategy: ${e.networking_tip}` : '',
        ]
          .filter(Boolean)
          .join('\\n\\n');

        lines.push('BEGIN:VEVENT');
        lines.push(`DTSTART;TZID=Asia/Kolkata:${dtStart}`);
        lines.push(`DTEND;TZID=Asia/Kolkata:${dtEnd}`);
        lines.push(`SUMMARY:${e.title}`);
        lines.push(`LOCATION:${e.venue}${e.room ? `, ${e.room}` : ''}`);
        lines.push(`DESCRIPTION:${desc}`);
        lines.push(`UID:${e.event_id}@aisummitstrategist`);
        lines.push('END:VEVENT');
      }
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function handleExportCalendar() {
    const ics = generateICS();
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-summit-strategy.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E0DCD6] border-t-[#4338CA]" />
          <p className="text-sm text-[#A8A29E]">Loading your strategy...</p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------
  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF9F7]">
            <ArrowLeft className="size-5 text-[#A8A29E]" />
          </div>
          <p className="text-[15px] font-semibold text-[#292524]">No schedule found</p>
          <p className="text-[13px] text-[#A8A29E]">
            Your strategy may have expired. Build a new one to get started.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-2 rounded-lg border border-[#E0DCD6] bg-[#FAF9F7] px-4 py-2 text-sm font-medium text-[#292524] transition-colors hover:bg-[#EDEAE5]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Computed values
  // -----------------------------------------------------------------------

  const totalPrimaryEvents = plan.schedule.reduce(
    (acc, day) => acc + day.events.filter((e) => !e.isFallback).length,
    0
  );

  const hasUpcomingEvents = plan.schedule.some((day) =>
    day.events.some(
      (e) => !e.isFallback && !isEventPast(e.event.date, e.event.start_time, e.event.end_time)
    )
  );

  // Find the day that has the next upcoming event
  const currentDay = (() => {
    for (const day of plan.schedule) {
      for (const se of day.events) {
        if (se.isFallback) continue;
        if (!isEventPast(se.event.date, se.event.start_time, se.event.end_time)) {
          return day.date;
        }
      }
    }
    return null;
  })();

  // Only show "Jump to Now" if today's date is actually in the schedule
  const todayIST = getCurrentDateIST();
  const todayInSchedule = plan.schedule.some((d) => d.date === todayIST);
  const isAwayFromNow = hasUpcomingEvents && todayInSchedule && currentDay && activeDay !== currentDay;

  function scrollToNextEvent() {
    if (!plan) return;
    for (const day of plan.schedule) {
      for (const se of day.events) {
        if (se.isFallback) continue;
        if (!isEventPast(se.event.date, se.event.start_time, se.event.end_time)) {
          const targetId = se.event.event_id;
          if (activeDay === se.event.date) {
            // Already on the right day — scroll directly
            requestAnimationFrame(() => {
              setTimeout(() => {
                const el = document.querySelector(`[data-event-id="${targetId}"]`);
                if (el) {
                  const rect = el.getBoundingClientRect();
                  const offset = 120;
                  window.scrollBy({ top: rect.top - offset, behavior: 'smooth' });
                }
              }, 50);
            });
          } else {
            // Different day — switch tab, then scroll via pending ref
            pendingScrollRef.current = targetId;
            setActiveDay(se.event.date);
          }
          return;
        }
      }
    }
  }

  // Filter schedule by active day
  const visibleSchedule = activeDay
    ? plan.schedule.filter((d) => d.date === activeDay)
    : plan.schedule;

  // Track a running event index for stagger animation
  let globalEventIndex = 0;

  return (
    <div className="min-h-screen bg-[#EEEBE6]">
      {/* ── NEW VISITOR STRIP ──────────────────────────────────── */}
      {isNewVisitor && !stripDismissed && (
        <div className="no-print bg-gradient-to-r from-[#4338CA] to-[#6366F1] px-4 py-2.5">
          <div className="mx-auto flex max-w-[780px] items-center justify-between gap-3">
            <p className="text-[13px] font-medium text-white/90">
              This is a personalised schedule.{' '}
              <button
                onClick={() => router.push('/quiz')}
                className="font-bold text-white underline underline-offset-2 decoration-white/50 hover:decoration-white"
              >
                Generate yours in 30 seconds →
              </button>
            </p>
            <button
              onClick={() => setStripDismissed(true)}
              className="shrink-0 rounded-md p-0.5 text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[780px] px-4 py-8 sm:px-6 sm:py-12">

        {/* Header Section */}
        <header className="animate-fade-in mb-8">
          {/* Overline */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#A8A29E]">
            INDIA AI IMPACT SUMMIT 2026
          </p>

          {/* Plan headline */}
          <h1 className="mb-4 text-[22px] font-extrabold leading-[1.15] tracking-tight text-[#292524] md:text-[36px]">
            {userName ? `${userName}'s Summit Strategy` : plan.headline}
          </h1>

          {/* Strategy note */}
          <p className="mb-5 text-[15px] leading-relaxed text-[#57534E]">
            {plan.strategyNote}
          </p>

          {/* Stats */}
          <p className="text-[13px] text-[#A8A29E]">
            <span className="font-[family-name:var(--font-mono)]">{totalPrimaryEvents}</span> events
            {' \u00B7 '}
            <span className="font-[family-name:var(--font-mono)]">{plan.schedule.length}</span>{' '}
            {plan.schedule.length === 1 ? 'day' : 'days'}
            {plan.exhibitors.length > 0 && (
              <>
                {' \u00B7 '}
                <span className="font-[family-name:var(--font-mono)]">{plan.exhibitors.length}</span> exhibitions
              </>
            )}
          </p>

          {/* Export to Calendar */}
          <button
            onClick={handleExportCalendar}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#E0DCD6] bg-[#FAF9F7] px-4 py-2.5 text-[13px] font-semibold text-[#292524] transition-colors hover:bg-[#EDEAE5]"
          >
            <CalendarDays className="size-4" />
            Export to Calendar
          </button>

        </header>

        {/* ── DATE FILTER TABS ─────────────────────────────────── */}
        {plan.schedule.length > 1 && (
          <div className="date-filter-bar sticky top-[49px] z-20 -mx-4 mb-6 overflow-x-auto bg-[#EEEBE6]/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
            <div className="flex items-center gap-2">
              {plan.schedule.map((day) => {
                const isActive = activeDay === day.date;
                const dayEvents = day.events.filter((e) => !e.isFallback);
                return (
                  <button
                    key={day.date}
                    onClick={() => {
                      setActiveDay(day.date);
                      requestAnimationFrame(() => {
                        const section = document.querySelector('[data-day-section]');
                        if (section) {
                          const rect = section.getBoundingClientRect();
                          const offset = 120;
                          window.scrollBy({ top: rect.top - offset, behavior: 'smooth' });
                        }
                      });
                    }}
                    className={`flex shrink-0 flex-col items-center rounded-xl px-4 py-2 text-center transition-all ${
                      isActive
                        ? 'bg-[#4338CA] text-white shadow-[0_2px_8px_rgba(67,56,202,0.25)]'
                        : 'bg-white text-[#57534E] hover:bg-[#EEF2FF] hover:text-[#4338CA]'
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide">
                      {dayShort(day.date)}
                    </span>
                    <span className="text-[18px] font-bold leading-tight">
                      {dayNum(day.date)}
                    </span>
                    <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-[#A8A29E]'}`}>
                      {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                    </span>
                  </button>
                );
              })}
              {/* "All Days" pill */}
              <button
                onClick={() => {
                  setActiveDay(null);
                  requestAnimationFrame(() => {
                    const section = document.querySelector('[data-day-section]');
                    if (section) {
                      const rect = section.getBoundingClientRect();
                      const offset = 120;
                      window.scrollBy({ top: rect.top - offset, behavior: 'smooth' });
                    }
                  });
                }}
                className={`shrink-0 rounded-xl px-4 py-3 text-[12px] font-semibold transition-all ${
                  activeDay === null
                    ? 'bg-[#4338CA] text-white shadow-[0_2px_8px_rgba(67,56,202,0.25)]'
                    : 'bg-white text-[#57534E] hover:bg-[#EEF2FF] hover:text-[#4338CA]'
                }`}
              >
                All Days
              </button>
            </div>
          </div>
        )}

        {/* Timeline Section */}
        <section className="mb-16">
          {visibleSchedule.map((daySchedule, dayIndex) => {
            const primaryEvents = daySchedule.events.filter((e) => !e.isFallback);
            const fallbackEvents = daySchedule.events.filter((e) => e.isFallback);

            // Build a map from primary event_id to its fallback
            const fallbackMap = new Map<string, typeof fallbackEvents[number]>();
            for (const fb of fallbackEvents) {
              if (fb.fallbackFor) {
                fallbackMap.set(fb.fallbackFor, fb);
              }
            }

            // Apply swaps: replace primary events with swapped alternatives
            // Track original event_id for fallback resolution
            const originalEventIds: string[] = [];
            const visibleEvents = primaryEvents.map((se) => {
              const slotKey = `${se.event.date}T${se.event.start_time}`;
              const swappedEventId = planEdits.swapped[slotKey];
              originalEventIds.push(se.event.event_id);
              if (!swappedEventId) return se;

              // Find the swapped event in ALL_EVENTS
              const swappedEvent = ALL_EVENTS.find((e) => e.event_id === swappedEventId);
              if (!swappedEvent) return se;

              // Create a new ScoredEvent for the swapped-in event, preserving alternatives from original
              const swapped: ScoredEvent = {
                event: swappedEvent,
                score: se.score,
                tier: se.tier,
                isFallback: false,
                breakdown: se.breakdown,
                alternatives: se.alternatives,
              };
              return swapped;
            });

            // Check if all events in this day are past
            const allDayPast = visibleEvents.length > 0 && visibleEvents.every(
              (e) => isEventPast(e.event.date, e.event.start_time, e.event.end_time)
            );

            return (
              <div key={daySchedule.date} data-day-section className={dayIndex < visibleSchedule.length - 1 ? 'pt-2' : ''}>
                {/* Day header */}
                <div
                  className="animate-fade-in mb-4 flex items-baseline gap-3 border-b border-[#E0DCD6] pb-4"
                  style={{ animationDelay: `${dayIndex * 0.1}s` }}
                >
                  <h2 className="text-lg font-bold text-[#292524]">
                    {formatDate(daySchedule.date)}
                  </h2>
                  <span className="text-xs text-[#A8A29E]">
                    {visibleEvents.length} {visibleEvents.length === 1 ? 'event' : 'events'}
                  </span>
                  {allDayPast && (
                    <span className="rounded-md bg-[#EDEAE5] px-2 py-0.5 text-[11px] font-medium text-[#A8A29E]">
                      Completed
                    </span>
                  )}
                </div>

                {/* Event slots in timeline layout */}
                <div>
                  {visibleEvents.map((scoredEvent, eventIndex) => {
                    const currentIndex = globalEventIndex;
                    globalEventIndex += 1;
                    // Use original event_id for fallback lookup (survives swaps)
                    const origId = originalEventIds[eventIndex];
                    const fallback = fallbackMap.get(origId) || null;
                    const isLast = eventIndex === visibleEvents.length - 1;
                    const isPast = isEventPast(scoredEvent.event.date, scoredEvent.event.start_time, scoredEvent.event.end_time);

                    // Alternatives count: total alternatives minus the fallback (P2) already shown
                    const totalAlternatives = scoredEvent.alternatives?.length ?? 0;
                    const alternativesCount = fallback
                      ? Math.max(0, totalAlternatives - 1)
                      : totalAlternatives;

                    return (
                      <TimeSlotRow
                        key={origId}
                        slotId={origId}
                        primary={scoredEvent}
                        fallback={fallback}
                        alternativesCount={alternativesCount}
                        index={currentIndex}
                        isLast={isLast}
                        isPast={isPast}
                        onViewAll={handleViewAll}
                        onDetailOpen={setDetailEvent}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* Exhibitor Section */}
        {plan.exhibitors.length > 0 && (
          <section className="animate-fade-in mb-16">
            <div className="mb-6 flex items-baseline gap-3">
              <h2 className="text-lg font-bold text-[#292524]">
                Exhibitions to Visit
              </h2>
              <span className="text-xs text-[#A8A29E]">
                {plan.exhibitors.length} {plan.exhibitors.length === 1 ? 'pick' : 'picks'}
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
              {plan.exhibitors.map((scoredExhibitor) => (
                <ExhibitorCard
                  key={scoredExhibitor.exhibitor.id}
                  scoredExhibitor={scoredExhibitor}
                />
              ))}
            </div>
          </section>
        )}

        {/* Bottom actions */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleExportCalendar}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E0DCD6] bg-[#FAF9F7] px-4 py-2.5 text-[13px] font-semibold text-[#292524] transition-colors hover:bg-[#EDEAE5]"
          >
            <CalendarDays className="size-4" />
            Export to Calendar
          </button>
          <button
            onClick={() => router.push('/explore')}
            className="inline-flex items-center gap-2 rounded-lg border border-[#4338CA]/30 bg-[#EEF2FF] px-4 py-2.5 text-[13px] font-semibold text-[#4338CA] transition-colors hover:bg-[#4338CA] hover:text-white hover:border-[#4338CA]"
          >
            Browse all 463 events
          </button>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#E0DCD6] py-8 text-center">
          <p className="text-[13px] text-[#A8A29E]">
            Generated by AI Impact Summit Planner
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-2 text-[13px] text-[#4338CA] transition-colors hover:text-[#3730A3]"
          >
            Build a new schedule
          </button>
        </footer>
      </main>

      {/* ── FLOATING ACTION BAR ──────────────────────────────────── */}
      <div className="no-print fixed bottom-6 left-1/2 z-40 -translate-x-1/2 flex items-center gap-1 rounded-2xl border border-[#4338CA]/20 bg-white/95 px-2 py-2 shadow-[0_4px_24px_rgba(67,56,202,0.15)] backdrop-blur-md">
        <button
          onClick={() => setShowSaveModal(true)}
          className="group flex flex-col items-center justify-center gap-0.5 rounded-xl bg-[#EEF2FF] px-3.5 py-2 transition-all hover:bg-[#4338CA]"
          title="Save your schedule"
        >
          <Bookmark className="size-4 text-[#4338CA] group-hover:text-white" />
          <span className="text-[9px] font-bold text-[#4338CA] group-hover:text-white">Save</span>
        </button>
        <button
          onClick={() => window.print()}
          className="group flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 transition-colors hover:bg-[#EEF2FF]"
          title="Save as PDF"
        >
          <FileDown className="size-4 text-[#57534E] group-hover:text-[#4338CA]" />
          <span className="text-[9px] font-medium text-[#A8A29E] group-hover:text-[#4338CA]">PDF</span>
        </button>
        {hasUpcomingEvents && (
          isAwayFromNow ? (
            <button
              onClick={scrollToNextEvent}
              className="flex items-center gap-1.5 rounded-xl bg-[#4338CA] px-3.5 py-2 transition-all hover:bg-[#3730A3]"
              title="Jump to next upcoming event"
            >
              <Clock className="size-3.5 text-white" />
              <span className="text-[11px] font-bold text-white">Jump to Now</span>
            </button>
          ) : (
            <button
              onClick={scrollToNextEvent}
              className="group flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 transition-colors hover:bg-[#EEF2FF]"
              title="Jump to next upcoming event"
            >
              <Clock className="size-4 text-[#57534E] group-hover:text-[#4338CA]" />
              <span className="text-[9px] font-medium text-[#A8A29E] group-hover:text-[#4338CA]">Now</span>
            </button>
          )
        )}
        <div className="mx-0.5 h-8 w-px bg-[#E0DCD6]" />
        {isNewVisitor ? (
          <button
            onClick={() => router.push('/quiz')}
            className="flex items-center gap-1.5 rounded-xl bg-[#4338CA] px-4 py-2 transition-all hover:bg-[#3730A3]"
            title="Generate your own schedule"
          >
            <Sparkles className="size-3.5 text-white" />
            <span className="text-[11px] font-bold text-white">Get Yours</span>
          </button>
        ) : (
          <button
            onClick={() => router.push('/quiz')}
            className="group flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 transition-colors hover:bg-[#EEF2FF]"
            title="Create a new strategy"
          >
            <RotateCcw className="size-4 text-[#57534E] group-hover:text-[#4338CA]" />
            <span className="text-[9px] font-medium text-[#A8A29E] group-hover:text-[#4338CA]">New</span>
          </button>
        )}
      </div>

      {/* ── SWAP / VIEW ALL MODAL ──────────────────────────────── */}
      {swapTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setSwapTarget(null)}
          />

          <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[70vh] overflow-hidden shadow-xl animate-slide-up">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E0DCD6] bg-white px-5 py-4">
              <div>
                <p className="text-[15px] font-semibold text-[#292524]">
                  Alternatives at {formatTime(swapTarget.event.start_time)}
                </p>
                <p className="text-xs text-[#A8A29E]">
                  {formatDate(swapTarget.event.date)}
                </p>
              </div>
              <button
                onClick={() => setSwapTarget(null)}
                className="rounded-lg p-1.5 text-[#A8A29E] hover:bg-[#FAF9F7] hover:text-[#292524] transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Current event (muted) */}
            <div className="border-b border-[#E0DCD6] bg-[#FAF9F7] px-5 py-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">
                Currently selected
              </p>
              <p className="text-[13px] font-medium text-[#57534E]">
                {swapTarget.event.title}
              </p>
              <p className="text-[12px] text-[#A8A29E]">Score: {swapTarget.score}</p>
            </div>

            {/* Alternatives list — filter out the fallback (P2) to avoid duplicate */}
            <div className="overflow-y-auto max-h-[50vh] p-4 space-y-3">
              {(() => {
                // Get the fallback event_id for this slot so we can filter it out
                const fallbackEventId = (() => {
                  for (const day of plan.schedule) {
                    const fb = day.events.find(
                      (e) => e.isFallback && e.fallbackFor === swapTarget.event.event_id
                    );
                    if (fb) return fb.event.event_id;
                  }
                  return null;
                })();

                const filteredAlts = (swapTarget.alternatives ?? []).filter(
                  (alt) => alt.event_id !== fallbackEventId
                );

                return filteredAlts.length > 0 ? (
                  filteredAlts.map((alt) => (
                    <div
                      key={alt.event_id}
                      className="rounded-xl border border-[rgba(0,0,0,0.06)] p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold px-2 py-[3px] rounded-md bg-[#EDEAE5] text-[#57534E]">
                          {alt.tier}
                        </span>
                        {alt.is_heavy_hitter && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-[3px] rounded-md bg-[#FFF1F2] text-[#BE123C]">
                            <Flame className="size-3" />
                            Heavy Hitter
                          </span>
                        )}
                        {alt.score > 0 && (
                          <span className="ml-auto text-[11px] font-mono text-[#A8A29E]">
                            Score: {alt.score}
                          </span>
                        )}
                      </div>
                      <h4 className="text-[14px] font-semibold text-[#292524] mb-1">
                        {alt.title}
                      </h4>
                      <p className="text-xs text-[#A8A29E] mb-2">
                        {alt.venue}
                        {alt.room ? `, ${alt.room}` : ''}
                      </p>
                      {alt.one_liner && (
                        <p className="text-[13px] text-[#57534E] mb-3">{alt.one_liner}</p>
                      )}
                      <button
                        onClick={() => handleSwapSelect(alt.event_id)}
                        className="w-full rounded-lg border border-[#4338CA] bg-white px-3 py-2 text-[13px] font-semibold text-[#4338CA] transition-colors hover:bg-[#EEF2FF]"
                      >
                        Select this
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[13px] text-[#A8A29E]">
                      No alternatives available for this time slot.
                    </p>
                    <button
                      onClick={() => {
                        setSwapTarget(null);
                        router.push('/explore');
                      }}
                      className="mt-2 inline-block text-[13px] text-[#4338CA] hover:text-[#3730A3]"
                    >
                      Browse all events
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL BOTTOM SHEET (all screen sizes) ─────────────── */}
      {detailEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setDetailEvent(null)}
          />
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden shadow-xl animate-slide-up">
            {/* Handle bar (mobile) */}
            <div className="flex justify-center py-2 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-[#D5D0C8]" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 pb-3 pt-2 sm:pt-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  {(() => {
                    const ts = TIER_STYLES[detailEvent.tier];
                    return (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${ts.bg} ${ts.text}`}>
                        {detailEvent.tier}
                      </span>
                    );
                  })()}
                  {detailEvent.event.networking_signals.is_heavy_hitter && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FFF1F2] to-[#FECDD3] text-[#BE123C]">
                      <Flame className="size-2.5" />
                      VIP
                    </span>
                  )}
                </div>
                <h3 className="text-[16px] font-bold text-[#292524] leading-snug">
                  {detailEvent.event.title}
                </h3>
              </div>
              <button
                onClick={() => setDetailEvent(null)}
                className="ml-2 rounded-lg p-1.5 text-[#A8A29E] hover:bg-[#FAF9F7]"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto max-h-[65vh] px-5 pb-6">
              {/* Time & Venue */}
              <div className="flex items-center gap-3 text-[12px] text-[#57534E] mb-4">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {formatTime(detailEvent.event.start_time)}
                  {detailEvent.event.end_time && ` – ${formatTime(detailEvent.event.end_time)}`}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {detailEvent.event.venue}{detailEvent.event.room ? `, ${detailEvent.event.room}` : ''}
                </span>
              </div>

              {/* One-liner */}
              {detailEvent.event.summary_one_liner && (
                <p className="text-[13px] leading-relaxed text-[#57534E] mb-4">
                  {detailEvent.event.summary_one_liner}
                </p>
              )}

              {/* Speakers — one per line */}
              {(() => {
                const spk = parseSpeakers(detailEvent.event.speakers);
                return spk.length > 0 ? (
                  <div className="flex items-start gap-2 mb-3">
                    <Users className="mt-0.5 size-3.5 shrink-0 text-[#A8A29E]" />
                    <div>
                      {spk.map((name, i) => (
                        <p key={i} className="text-[13px] text-[#57534E] leading-relaxed">{name}</p>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Knowledge Partners */}
              {detailEvent.event.knowledge_partners && detailEvent.event.knowledge_partners.trim() !== '' && (
                <div className="flex items-start gap-2 mb-3">
                  <Building2 className="mt-0.5 size-3.5 shrink-0 text-[#A8A29E]" />
                  <p className="text-[13px] text-[#57534E]">
                    {detailEvent.event.knowledge_partners}
                  </p>
                </div>
              )}

              {/* Logo URLs — enriched from exhibitors + large */}
              {(() => {
                const logos = getEnrichedLogos(detailEvent.event.speakers, detailEvent.event.knowledge_partners, detailEvent.event.logo_urls ?? []);
                return logos.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {logos.map((url, i) => (
                    <div
                      key={i}
                      className="flex h-10 items-center overflow-hidden rounded-lg bg-[#FAF9F7] border border-[#E8E6E3] px-3"
                    >
                      <img
                        src={url}
                        alt="Partner logo"
                        className="h-7 w-auto object-contain"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
                ) : null;
              })()}

              {/* Icebreaker */}
              {detailEvent.event.icebreaker && (
                <div className="rounded-lg bg-[#FAF9F7] p-3 border-l-[3px] border-l-[#4338CA] mb-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <MessageCircle className="size-3 text-[#4338CA]" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A29E]">Icebreaker</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#57534E]">{detailEvent.event.icebreaker}</p>
                </div>
              )}

              {/* Strategy */}
              {detailEvent.event.networking_tip && (
                <div className="rounded-lg bg-[#FAF9F7] p-3 border-l-[3px] border-l-[#059669] mb-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Lightbulb className="size-3 text-[#059669]" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A29E]">Strategy</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#57534E]">{detailEvent.event.networking_tip}</p>
                </div>
              )}

              {/* Score Breakdown — only show when values are non-zero */}
              {(() => {
                const b = detailEvent.breakdown;
                const hasData = b.keywordScore > 0 || b.personaScore > 0 || b.depthScore > 0 ||
                  (b.goalRelevanceScore ?? 0) > 0 || (b.networkingSignalScore ?? 0) > 0 || (b.sectorScore ?? 0) > 0;
                return hasData ? (
                  <div className="mb-4 pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E] mb-2">Score Breakdown</p>
                    <ScoreBreakdown breakdown={b} />
                  </div>
                ) : null;
              })()}

              {/* Networking signals */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1 bg-[#EDEAE5] text-[#57534E] rounded-md text-xs px-2 py-[3px]">
                  Decision Makers: {detailEvent.event.networking_signals.decision_maker_density}
                </span>
                <span className="inline-flex items-center gap-1 bg-[#EDEAE5] text-[#57534E] rounded-md text-xs px-2 py-[3px]">
                  Investors: {detailEvent.event.networking_signals.investor_presence}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-[#E0DCD6]">
                <button
                  onClick={() => { setDetailEvent(null); handleViewAll(detailEvent.event.event_id); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#4338CA]/30 bg-[#EEF2FF] px-4 py-2.5 text-[13px] font-semibold text-[#4338CA] hover:bg-[#4338CA] hover:text-white hover:border-[#4338CA] transition-all"
                >
                  <ArrowLeftRight className="size-4" />
                  View Alternatives
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SAVE YOUR PLAN MODAL ────────────────────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setShowSaveModal(false)}
          />
          <div className="relative w-full max-w-[420px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up overflow-hidden">
            {/* Accent bar */}
            <div className="h-1 bg-gradient-to-r from-[#4338CA] via-[#6366F1] to-[#818CF8]" />

            {/* Handle bar (mobile) */}
            <div className="flex justify-center py-2 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-[#D5D0C8]" />
            </div>

            <div className="px-6 pb-6 pt-4 sm:pt-5">
              {/* Header */}
              <div className="mb-2 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#EEF2FF]">
                  <Bookmark className="size-5 text-[#4338CA]" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-[#292524]">Save your schedule</h3>
                  <p className="text-[13px] text-[#A8A29E]">This schedule is unique to you</p>
                </div>
              </div>

              <p className="mb-5 text-[14px] leading-relaxed text-[#57534E]">
                There&apos;s no login — this URL is the <span className="font-semibold text-[#292524]">only way</span> to get back to your personalised strategy. Save it now!
              </p>

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5 mb-5">
                {/* Copy Link */}
                <button
                  onClick={handleSaveModalCopy}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
                    saveCopied
                      ? 'border-[#059669] bg-[#ECFDF5]'
                      : 'border-[#E0DCD6] hover:border-[#4338CA]/30 hover:bg-[#F5F3FF]'
                  }`}
                >
                  <div className={`flex size-9 items-center justify-center rounded-lg ${saveCopied ? 'bg-[#059669]' : 'bg-[#EEF2FF]'}`}>
                    <Link2 className={`size-4 ${saveCopied ? 'text-white' : 'text-[#4338CA]'}`} />
                  </div>
                  <div>
                    <span className={`block text-[14px] font-semibold ${saveCopied ? 'text-[#059669]' : 'text-[#292524]'}`}>
                      {saveCopied ? 'Link copied!' : 'Copy schedule link'}
                    </span>
                    <span className="text-[11px] text-[#A8A29E]">Paste in notes or bookmark it</span>
                  </div>
                </button>

                {/* WhatsApp */}
                <button
                  onClick={handleWhatsAppShare}
                  className="flex items-center gap-3 rounded-xl border border-[#E0DCD6] px-4 py-3.5 text-left transition-all hover:border-[#25D366]/30 hover:bg-[#F0FFF4]"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#25D366]">
                    <svg viewBox="0 0 24 24" className="size-4 text-white" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-[14px] font-semibold text-[#292524]">Send via WhatsApp</span>
                    <span className="text-[11px] text-[#A8A29E]">Send the link to yourself or a friend</span>
                  </div>
                </button>

                {/* Download PDF */}
                <button
                  onClick={() => { setShowSaveModal(false); setTimeout(() => window.print(), 300); }}
                  className="flex items-center gap-3 rounded-xl border border-[#E0DCD6] px-4 py-3.5 text-left transition-all hover:border-[#4338CA]/30 hover:bg-[#F5F3FF]"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#EEF2FF]">
                    <Download className="size-4 text-[#4338CA]" />
                  </div>
                  <div>
                    <span className="block text-[14px] font-semibold text-[#292524]">Download PDF</span>
                    <span className="text-[11px] text-[#A8A29E]">Works offline at the venue</span>
                  </div>
                </button>
              </div>

              {/* Dismiss */}
              <button
                onClick={() => setShowSaveModal(false)}
                className="w-full rounded-xl bg-[#4338CA] py-3 text-[14px] font-bold text-white transition-all hover:bg-[#3730A3]"
              >
                Got it, let me explore my schedule
              </button>

              {/* Builder note */}
              <p className="mt-4 text-center text-[12px] text-[#A8A29E]">
                Built by Piyush — see you at the summit!{' '}
                <a href="https://www.linkedin.com/in/piyushmayank/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#4338CA] hover:text-[#3730A3]">Let&apos;s connect</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification for copy */}
      {copied && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 animate-slide-up rounded-xl bg-[#1A1A19] px-4 py-2 shadow-lg">
          <p className="text-sm font-medium text-white">Link copied to clipboard</p>
        </div>
      )}
    </div>
  );
}
