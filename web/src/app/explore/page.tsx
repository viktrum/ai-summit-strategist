'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import eventsData from '@/data/events.json';
import exhibitorsData from '@/data/exhibitors.json';
import type { Event, Exhibitor } from '@/lib/types';
import { formatTime, parseSpeakers, formatDateShort, dayShort, dayNum } from '@/lib/format';
import { getEnrichedLogos } from '@/lib/logo-lookup';
import {
  Search,
  Calendar,
  MapPin,
  X,
  Flame,
  ChevronDown,
  Clock,
  Users,
  MessageCircle,
  Lightbulb,
  Building2,
  Store,
  Sparkles,
  CalendarDays,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const allEvents = eventsData as Event[];
const allExhibitors = exhibitorsData as Exhibitor[];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_DATES = ['2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20'];

const SECTOR_META: Record<string, { label: string; emoji: string }> = {
  'AI Governance & Ethics': { label: 'Governance & Ethics', emoji: '⚖️' },
  'Business & Entrepreneurship': { label: 'Business & Startups', emoji: '🚀' },
  'Social Impact & Inclusion': { label: 'Social Impact', emoji: '🌍' },
  'Geopolitics & Global Strategy': { label: 'Geopolitics', emoji: '🌐' },
  'Industry Applications': { label: 'Industry', emoji: '🏭' },
  'Data & Infrastructure': { label: 'Infrastructure', emoji: '🔧' },
  'Skills & Workforce Development': { label: 'Skills & Talent', emoji: '🎓' },
  'Regulatory & Legal Frameworks': { label: 'Regulation', emoji: '📋' },
  'Research & Innovation': { label: 'Research', emoji: '🔬' },
  'Specialized AI Domains': { label: 'Specialized AI', emoji: '🧠' },
  'Digital Transformation & Services': { label: 'Digital Services', emoji: '💻' },
  'AI Technology & Architecture': { label: 'AI Technology', emoji: '⚙️' },
};

const ALL_SECTORS = Object.keys(SECTOR_META);

type MainTab = 'events' | 'exhibitions';
type VipFilter = 'all' | 'vip' | 'nonvip';

const dayLabel = formatDateShort;

// ---------------------------------------------------------------------------
// FilterDropdown — reusable multi-select dropdown with checkboxes
// ---------------------------------------------------------------------------

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: { id: string; label: string; emoji: string; count: number }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hasSelection = selected.size > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
          hasSelection
            ? 'bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]'
            : 'bg-white text-[#57534E] border border-[#E0DCD6] hover:border-[#C7D2FE]'
        }`}
      >
        {label}
        {hasSelection && (
          <span className="flex size-4 items-center justify-center rounded-full bg-[#4338CA] text-[9px] font-bold text-white">
            {selected.size}
          </span>
        )}
        <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-72 rounded-xl bg-white border border-[#E0DCD6] shadow-[0_8px_24px_rgba(0,0,0,0.1)] overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((opt) => {
              const isSelected = selected.has(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => onToggle(opt.id)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    isSelected ? 'bg-[#EEF2FF]' : 'hover:bg-[#FAF9F7]'
                  }`}
                >
                  <div
                    className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                      isSelected ? 'border-[#4338CA] bg-[#4338CA]' : 'border-[#D5D0C8]'
                    }`}
                  >
                    {isSelected && (
                      <svg className="size-2.5 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[14px]">{opt.emoji}</span>
                  <span className={`flex-1 text-[13px] ${isSelected ? 'font-semibold text-[#292524]' : 'text-[#57534E]'}`}>
                    {opt.label}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#A8A29E]">
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>
          {hasSelection && (
            <div className="border-t border-[#E0DCD6] px-3 py-2">
              <button
                onClick={() => { onClear(); setOpen(false); }}
                className="text-[12px] font-semibold text-[#4338CA] hover:text-[#3730A3]"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventRow — smart content card (VIP → speakers, Non-VIP → keywords)
// ---------------------------------------------------------------------------

function EventRow({
  ev,
  onDetailOpen,
  showDate,
}: {
  ev: Event;
  onDetailOpen: (ev: Event) => void;
  showDate?: boolean;
}) {
  const speakers = parseSpeakers(ev.speakers);
  const isHH = ev.networking_signals?.is_heavy_hitter;
  const allLogos = getEnrichedLogos(ev.speakers, ev.knowledge_partners, ev.logo_urls ?? []);
  const hasLogos = allLogos.length > 0;

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-[250ms] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
        isHH
          ? 'border border-[#FFC9C9] shadow-[0_2px_8px_rgba(190,18,60,0.06)]'
          : 'border border-[#E0DCD6] shadow-[0_2px_6px_rgba(0,0,0,0.04)]'
      }`}
      style={{ backgroundColor: isHH ? '#FFFBF9' : '#FFFFFF' }}
    >
      <button onClick={() => onDetailOpen(ev)} className="w-full p-4 px-5 text-left">
        {/* Top row: time + badges */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold text-[#A8A29E]">
            {formatTime(ev.start_time)}
            {ev.end_time && ` – ${formatTime(ev.end_time)}`}
          </span>
          {isHH && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FFF1F2] to-[#FECDD3] text-[#BE123C]">
              <Flame className="size-2.5" />
              VIP
            </span>
          )}
          {showDate && (
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#A8A29E] ml-auto">
              {dayLabel(ev.date)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold text-[#292524] leading-snug line-clamp-2 mb-1.5">
          {ev.title}
        </h3>

        {/* Venue */}
        <p className="text-[11px] text-[#A8A29E] mb-3">
          {ev.venue}{ev.room ? ` · ${ev.room}` : ''}
          {ev.networking_signals?.decision_maker_density === 'High' && (
            <span className="ml-2 rounded bg-[#FFFBEB] px-1.5 py-[1px] text-[9px] font-semibold text-[#D97706]">
              High-value room
            </span>
          )}
        </p>

        {/* Smart content: VIP → speakers, Non-VIP → keywords */}
        {isHH ? (
          speakers.length > 0 && (
            <div className="mb-3">
              {speakers.slice(0, 3).map((name, i) => (
                <p key={i} className="text-[12px] text-[#57534E] leading-relaxed">
                  {name}
                </p>
              ))}
              {speakers.length > 3 && (
                <p className="text-[11px] text-[#A8A29E]">
                  +{speakers.length - 3} more
                </p>
              )}
            </div>
          )
        ) : (
          ev.keywords && ev.keywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {ev.keywords.slice(0, 3).map((kw, i) => (
                <span
                  key={i}
                  className="rounded-md bg-[#EDEAE5] px-2 py-0.5 text-[10px] font-medium text-[#57534E]"
                >
                  {kw.keyword}
                </span>
              ))}
            </div>
          )
        )}

        {/* Company logos */}
        {hasLogos && (
          <div className="flex flex-wrap items-center gap-3">
            {allLogos.map((url, i) => (
              <div
                key={i}
                className="flex h-8 items-center overflow-hidden rounded-lg bg-white border border-[#E8E6E3] px-2.5"
              >
                <img
                  src={url}
                  alt="Partner"
                  className="h-6 w-auto object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventDetailSheet — full-detail bottom sheet / modal
// ---------------------------------------------------------------------------

function EventDetailSheet({
  ev,
  onClose,
}: {
  ev: Event;
  onClose: () => void;
}) {
  const router = useRouter();
  const speakers = parseSpeakers(ev.speakers);
  const isHH = ev.networking_signals?.is_heavy_hitter;
  const allLogos = getEnrichedLogos(ev.speakers, ev.knowledge_partners, ev.logo_urls ?? []);

  // Check if user has a schedule and if this event is already in it
  const [addState, setAddState] = useState<'no-schedule' | 'can-add' | 'added' | 'already'>('no-schedule');
  useEffect(() => {
    try {
      const planId = localStorage.getItem('lastPlanId');
      if (!planId) { setAddState('no-schedule'); return; }
      const raw = localStorage.getItem('planResult');
      if (!raw) { setAddState('no-schedule'); return; }
      const plan = JSON.parse(raw);
      const allEventIds = new Set(
        plan.schedule?.flatMap((d: { events: { event: { event_id: string } }[] }) =>
          d.events.map((e: { event: { event_id: string } }) => e.event.event_id)
        ) ?? []
      );
      setAddState(allEventIds.has(ev.event_id) ? 'already' : 'can-add');
    } catch {
      setAddState('no-schedule');
    }
  }, [ev.event_id]);

  function handleAddToSchedule() {
    try {
      const raw = localStorage.getItem('planResult');
      if (!raw) return;
      const plan = JSON.parse(raw);

      // Create the new scored event
      const newEvent = {
        event: ev,
        score: 0,
        tier: 'Nice to Have',
        isFallback: false,
        isManual: true,
        breakdown: {
          keywordScore: 0, personaScore: 0, depthScore: 0, heavyHitterBonus: 0,
          goalRelevanceScore: 0, networkingSignalScore: 0, sectorScore: 0, dealBreakerPenalty: 0,
        },
      };

      // Find or create the day
      let day = plan.schedule.find((d: { date: string }) => d.date === ev.date);
      if (!day) {
        day = { date: ev.date, events: [] };
        plan.schedule.push(day);
        plan.schedule.sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));
      }

      // Insert sorted by start_time
      day.events.push(newEvent);
      day.events.sort((a: { event: { start_time: string } }, b: { event: { start_time: string } }) =>
        (a.event.start_time || '').localeCompare(b.event.start_time || '')
      );

      // Update total
      plan.totalEvents = plan.schedule.reduce(
        (acc: number, d: { events: { isFallback: boolean }[] }) =>
          acc + d.events.filter((e: { isFallback: boolean }) => !e.isFallback).length,
        0
      );

      // Save back to localStorage
      localStorage.setItem('planResult', JSON.stringify(plan));

      // Sync to Supabase
      const planId = localStorage.getItem('lastPlanId');
      if (planId) {
        const slimEvents = plan.schedule.flatMap((d: { events: Array<{ event: { id: number }; tier: string; score: number; isFallback: boolean; fallbackFor?: string; isManual?: boolean }> }) =>
          d.events.map((se) => ({
            id: se.event.id,
            tier: se.tier,
            score: se.score,
            pinned: false,
            is_fallback: se.isFallback,
            fallback_for: null,
            is_manual: se.isManual || false,
          }))
        );
        import('@/lib/supabase').then(({ supabase }) => {
          supabase
            .from('user_plans')
            .update({ events: slimEvents })
            .eq('id', planId)
            .then(({ error }) => {
              if (error) console.warn('Failed to sync manual add:', error.message);
            });
        });
      }

      setAddState('added');
    } catch (err) {
      console.error('Failed to add event:', err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
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
              {isHH && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FFF1F2] to-[#FECDD3] text-[#BE123C]">
                  <Flame className="size-2.5" />
                  VIP
                </span>
              )}
              {ev.networking_signals?.decision_maker_density === 'High' && (
                <span className="rounded bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-semibold text-[#D97706]">
                  High-value room
                </span>
              )}
            </div>
            <h3 className="text-[16px] font-bold text-[#292524] leading-snug">
              {ev.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="ml-2 rounded-lg p-1.5 text-[#A8A29E] hover:bg-[#FAF9F7]"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[65vh] px-5 pb-6">
          {/* Time & Venue */}
          <div className="flex items-center gap-3 text-[12px] text-[#57534E] mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {formatTime(ev.start_time)}
              {ev.end_time && ` – ${formatTime(ev.end_time)}`}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {ev.venue}{ev.room ? `, ${ev.room}` : ''}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" />
              {dayLabel(ev.date)}
            </span>
          </div>

          {/* One-liner */}
          {ev.summary_one_liner && (
            <p className="text-[13px] leading-relaxed text-[#57534E] mb-4">
              {ev.summary_one_liner}
            </p>
          )}

          {/* Speakers */}
          {speakers.length > 0 && (
            <div className="flex items-start gap-2 mb-3">
              <Users className="mt-0.5 size-3.5 shrink-0 text-[#A8A29E]" />
              <div>
                {speakers.map((name, i) => (
                  <p key={i} className="text-[13px] text-[#57534E] leading-relaxed">{name}</p>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge Partners */}
          {ev.knowledge_partners?.trim() && (
            <div className="flex items-start gap-2 mb-3">
              <Building2 className="mt-0.5 size-3.5 shrink-0 text-[#A8A29E]" />
              <p className="text-[13px] text-[#57534E]">{ev.knowledge_partners}</p>
            </div>
          )}

          {/* Company logos */}
          {allLogos.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {allLogos.map((url, i) => (
                <div
                  key={i}
                  className="flex h-10 items-center overflow-hidden rounded-lg bg-[#FAF9F7] border border-[#E8E6E3] px-3"
                >
                  <img src={url} alt="Partner logo" className="h-7 w-auto object-contain" loading="lazy" />
                </div>
              ))}
            </div>
          )}

          {/* Icebreaker */}
          {ev.icebreaker && (
            <div className="rounded-lg bg-[#FAF9F7] p-3 border-l-[3px] border-l-[#4338CA] mb-3">
              <div className="mb-1 flex items-center gap-1.5">
                <MessageCircle className="size-3 text-[#4338CA]" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A29E]">Icebreaker</span>
              </div>
              <p className="text-[13px] leading-relaxed text-[#57534E]">{ev.icebreaker}</p>
            </div>
          )}

          {/* Strategy */}
          {ev.networking_tip && (
            <div className="rounded-lg bg-[#FAF9F7] p-3 border-l-[3px] border-l-[#059669] mb-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Lightbulb className="size-3 text-[#059669]" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A29E]">Strategy</span>
              </div>
              <p className="text-[13px] leading-relaxed text-[#57534E]">{ev.networking_tip}</p>
            </div>
          )}

          {/* Networking signals */}
          <div className="flex flex-wrap gap-2 mb-4">
            {isHH && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF1F2] px-2 py-[3px] text-[11px] font-semibold text-[#BE123C]">
                <Flame className="size-2.5" /> Heavy Hitter
              </span>
            )}
            <span className="inline-flex items-center gap-1 bg-[#EDEAE5] text-[#57534E] rounded-md text-xs px-2 py-[3px]">
              Decision Makers: {ev.networking_signals.decision_maker_density}
            </span>
            <span className="inline-flex items-center gap-1 bg-[#EDEAE5] text-[#57534E] rounded-md text-xs px-2 py-[3px]">
              Investors: {ev.networking_signals.investor_presence}
            </span>
            {ev.session_type && (
              <span className="rounded-md bg-[#EDEAE5] px-2 py-[3px] text-[11px] text-[#57534E]">
                {ev.session_type}
              </span>
            )}
          </div>

          {/* Keywords */}
          {ev.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {ev.keywords.map((k, i) => (
                <span key={i} className="rounded bg-[#EDEAE5] px-1.5 py-[2px] text-[10px] text-[#A8A29E]">
                  {k.keyword}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sticky footer — Add to Schedule button */}
        <div className="border-t border-[#E0DCD6] bg-white px-5 py-3">
          {addState === 'no-schedule' ? (
            <button
              onClick={() => { onClose(); router.push('/quiz'); }}
              className="w-full rounded-xl bg-[#4338CA] py-3 text-[13px] font-bold text-white transition-all hover:bg-[#3730A3]"
            >
              Generate a schedule first
            </button>
          ) : addState === 'already' || addState === 'added' ? (
            <div className="flex items-center justify-center gap-2 py-2 text-[13px] font-semibold text-[#059669]">
              <svg className="size-4" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {addState === 'added' ? 'Added to your schedule!' : 'Already in your schedule'}
            </div>
          ) : (
            <button
              onClick={handleAddToSchedule}
              className="w-full rounded-xl border-2 border-[#4338CA] bg-[#EEF2FF] py-3 text-[13px] font-bold text-[#4338CA] transition-all hover:bg-[#4338CA] hover:text-white"
            >
              Add to My Schedule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper (Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export default function ExplorePageWrapper() {
  return (
    <Suspense>
      <ExplorePage />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

function ExplorePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab: MainTab = searchParams.get('tab') === 'exhibitions' ? 'exhibitions' : 'events';

  // ── State ──────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState(ALL_DATES[0]);
  const [vipFilter, setVipFilter] = useState<VipFilter>('all');
  const [selectedSectors, setSelectedSectors] = useState<Set<string>>(new Set());
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [exSelectedSectors, setExSelectedSectors] = useState<Set<string>>(new Set());
  const [exCategory, setExCategory] = useState<string>('all');
  const [lastPlanId, setLastPlanId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLastPlanId(localStorage.getItem('lastPlanId'));
    } catch { /* ignore */ }
  }, []);

  // ── Helpers ────────────────────────────────────────────────────
  const toggleSector = (id: string) => {
    setSelectedSectors((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleExSector = (id: string) => {
    setExSelectedSectors((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Day event counts (for day pills) ──────────────────────────
  const dayEventCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of ALL_DATES) {
      counts.set(d, allEvents.filter((ev) => ev.date === d).length);
    }
    return counts;
  }, []);

  // ── Sector counts for event dropdown (respects day + VIP) ─────
  const sectorCounts = useMemo(() => {
    let dayEvents = allEvents.filter((ev) => ev.date === selectedDay);
    if (vipFilter === 'vip') dayEvents = dayEvents.filter((ev) => ev.networking_signals?.is_heavy_hitter);
    else if (vipFilter === 'nonvip') dayEvents = dayEvents.filter((ev) => !ev.networking_signals?.is_heavy_hitter);

    const counts = new Map<string, number>();
    for (const ev of dayEvents) {
      const seen = new Set<string>();
      for (const k of ev.keywords ?? []) {
        if (!seen.has(k.category)) {
          seen.add(k.category);
          counts.set(k.category, (counts.get(k.category) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [selectedDay, vipFilter]);

  const sectorOptions = useMemo(
    () =>
      ALL_SECTORS.map((id) => ({
        id,
        label: SECTOR_META[id].label,
        emoji: SECTOR_META[id].emoji,
        count: sectorCounts.get(id) ?? 0,
      })).sort((a, b) => b.count - a.count),
    [sectorCounts],
  );

  // ── Sector counts for exhibition dropdown ─────────────────────
  const exSectorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ex of allExhibitors) {
      const seen = new Set<string>();
      for (const k of ex.keywords ?? []) {
        if (!seen.has(k.category)) {
          seen.add(k.category);
          counts.set(k.category, (counts.get(k.category) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, []);

  const exSectorOptions = useMemo(
    () =>
      ALL_SECTORS.map((id) => ({
        id,
        label: SECTOR_META[id].label,
        emoji: SECTOR_META[id].emoji,
        count: exSectorCounts.get(id) ?? 0,
      })).sort((a, b) => b.count - a.count),
    [exSectorCounts],
  );

  // ── Search mode (3+ chars = global search, overrides all filters) ─
  const isSearchActive = searchQuery.trim().length >= 3;

  // ── Filtered events ───────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    // Search mode: search ALL dates, ignore day/VIP/sector filters
    if (isSearchActive) {
      const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      return allEvents
        .filter((ev) => {
          const hay = [ev.title, ev.description, ev.summary_one_liner, ev.speakers, ev.knowledge_partners, ...(ev.keywords?.map((k) => k.keyword) ?? [])].join(' ').toLowerCase();
          return words.every((w) => hay.includes(w));
        })
        .sort((a, b) => {
          const dc = a.date.localeCompare(b.date);
          return dc !== 0 ? dc : (a.start_time || '').localeCompare(b.start_time || '');
        });
    }

    // Normal mode: filter by selected day + VIP + sector
    let result = allEvents.filter((ev) => ev.date === selectedDay);

    if (vipFilter === 'vip') result = result.filter((ev) => ev.networking_signals?.is_heavy_hitter);
    else if (vipFilter === 'nonvip') result = result.filter((ev) => !ev.networking_signals?.is_heavy_hitter);

    if (selectedSectors.size > 0) {
      result = result.filter((ev) => ev.keywords?.some((k) => selectedSectors.has(k.category)));
    }

    result.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    return result;
  }, [isSearchActive, searchQuery, selectedDay, vipFilter, selectedSectors]);

  // ── Time blocks (single-day, used in normal mode) ─────────────
  const timeBlocks = useMemo(() => {
    if (isSearchActive) return [];
    const blocks: { time: string; events: Event[] }[] = [];
    let ct = '';
    let cb: Event[] = [];
    for (const ev of filteredEvents) {
      const t = formatTime(ev.start_time);
      if (t !== ct) {
        if (cb.length > 0) blocks.push({ time: ct, events: cb });
        ct = t;
        cb = [ev];
      } else {
        cb.push(ev);
      }
    }
    if (cb.length > 0) blocks.push({ time: ct, events: cb });
    return blocks;
  }, [isSearchActive, filteredEvents]);

  // ── Search results grouped by date → time (used in search mode) ─
  const searchResultsByDate = useMemo(() => {
    if (!isSearchActive) return [];
    const dateMap = new Map<string, Event[]>();
    for (const ev of filteredEvents) {
      if (!dateMap.has(ev.date)) dateMap.set(ev.date, []);
      dateMap.get(ev.date)!.push(ev);
    }
    return Array.from(dateMap.entries()).map(([date, evts]) => ({
      date,
      events: evts,
    }));
  }, [isSearchActive, filteredEvents]);

  // ── Filtered exhibitors ───────────────────────────────────────
  const filteredExhibitors = useMemo(() => {
    let result = [...allExhibitors];

    if (isSearchActive && mainTab === 'exhibitions') {
      const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      result = result.filter((ex) => {
        const hay = [ex.name, ex.one_liner, ...(ex.keywords?.map((k) => k.keyword) ?? [])].join(' ').toLowerCase();
        return words.every((w) => hay.includes(w));
      });
    }

    if (!isSearchActive && exCategory !== 'all') {
      result = result.filter((ex) => ex.category === exCategory);
    }

    if (!isSearchActive && exSelectedSectors.size > 0) {
      result = result.filter((ex) => ex.keywords?.some((k) => exSelectedSectors.has(k.category)));
    }

    return result;
  }, [isSearchActive, searchQuery, mainTab, exCategory, exSelectedSectors]);

  // ── Stats ─────────────────────────────────────────────────────
  const totalDayEvents = allEvents.filter((ev) => ev.date === selectedDay).length;
  const dayVipCount = useMemo(
    () => allEvents.filter((ev) => ev.date === selectedDay && ev.networking_signals?.is_heavy_hitter).length,
    [selectedDay],
  );
  const hasActiveEventFilters = vipFilter !== 'all' || selectedSectors.size > 0;
  const hasActiveExFilters = exSelectedSectors.size > 0 || exCategory !== 'all';

  // ── VIP filter label helpers ──────────────────────────────────
  const VIP_OPTIONS: { value: VipFilter; label: string }[] = [
    { value: 'all', label: `All ${totalDayEvents}` },
    { value: 'vip', label: `VIP ${dayVipCount}` },
    { value: 'nonvip', label: `Non-VIP ${totalDayEvents - dayVipCount}` },
  ];

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#EEEBE6]">
      {/* ── STICKY HEADER ──────────────────────────────────────── */}
      <header className="sticky top-[49px] z-30 bg-[#FAF9F7] border-b border-[#E0DCD6]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Title row */}
          <div className="flex h-10 items-center justify-between">
            <h1 className="text-[15px] font-bold text-[#292524]">Explore</h1>
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#A8A29E]">
              {allEvents.length} events · {allExhibitors.length} exhibitions
            </span>
          </div>

          {/* Main toggle: Events | Exhibitions */}
          <div className="flex gap-0 mb-2.5">
            <button
              onClick={() => setMainTab('events')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-l-lg py-2.5 text-[13px] font-bold transition-all border ${
                mainTab === 'events'
                  ? 'bg-[#4338CA] text-white border-[#4338CA]'
                  : 'bg-white text-[#57534E] border-[#E0DCD6] hover:bg-[#FAF9F7]'
              }`}
            >
              <Calendar className="size-3.5" />
              Events
              <span className={`font-[family-name:var(--font-mono)] text-[11px] ${mainTab === 'events' ? 'text-white/60' : 'text-[#A8A29E]'}`}>
                {allEvents.length}
              </span>
            </button>
            <button
              onClick={() => setMainTab('exhibitions')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-r-lg py-2.5 text-[13px] font-bold transition-all border border-l-0 ${
                mainTab === 'exhibitions'
                  ? 'bg-[#4338CA] text-white border-[#4338CA]'
                  : 'bg-white text-[#57534E] border-[#E0DCD6] hover:bg-[#FAF9F7]'
              }`}
            >
              <Store className="size-3.5" />
              Exhibitions
              <span className={`font-[family-name:var(--font-mono)] text-[11px] ${mainTab === 'exhibitions' ? 'text-white/60' : 'text-[#A8A29E]'}`}>
                {allExhibitors.length}
              </span>
            </button>
          </div>

          {/* Shared search bar */}
          <div className="pb-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A8A29E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={mainTab === 'events' ? 'Search events, speakers, topics...' : 'Search exhibitions...'}
                className="w-full rounded-lg border border-[#E0DCD6] bg-white py-2.5 pl-10 pr-9 text-[13px] text-[#292524] placeholder:text-[#A8A29E] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all focus:border-[#4338CA] focus:outline-none focus:ring-[3px] focus:ring-[#EEF2FF]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#57534E]"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── CONTENT ────────────────────────────────────────────── */}
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:px-6">

        {/* ════════════ EVENTS TAB ════════════════════════════════ */}
        {mainTab === 'events' && (
          <div>
            {/* Search mode: cross-date timeline */}
            {isSearchActive ? (
              <>
                {/* Search results summary */}
                <div className="mb-4 flex items-center gap-3 text-[12px] text-[#A8A29E]">
                  <span>
                    <span className="font-[family-name:var(--font-mono)] font-bold text-[#292524]">{filteredEvents.length}</span>
                    {' '}result{filteredEvents.length !== 1 ? 's' : ''}
                    {searchResultsByDate.length > 0 && (
                      <span> across <span className="font-[family-name:var(--font-mono)] font-bold text-[#292524]">{searchResultsByDate.length}</span> day{searchResultsByDate.length !== 1 ? 's' : ''}</span>
                    )}
                  </span>
                </div>

                {filteredEvents.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-[15px] font-semibold text-[#292524]">No events found</p>
                    <p className="mt-1 text-[13px] text-[#A8A29E]">Try a different search term.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {searchResultsByDate.map((group) => (
                      <div key={group.date}>
                        {/* Date header */}
                        <div className="mb-3 flex items-center gap-2">
                          <span className="rounded-md bg-[#4338CA] px-2.5 py-1 text-[12px] font-bold text-white">
                            {dayLabel(group.date)}
                          </span>
                          <div className="h-px flex-1 bg-[#E0DCD6]" />
                          <span className="text-[11px] text-[#A8A29E]">
                            {group.events.length} result{group.events.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {group.events.map((ev) => (
                            <EventRow
                              key={ev.event_id}
                              ev={ev}
                              onDetailOpen={setDetailEvent}
                              showDate
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Normal mode: date pills + filters + time blocks */}

                {/* Date pills */}
                <div className="mb-3 flex gap-1.5">
                  {ALL_DATES.map((date) => {
                    const isActive = selectedDay === date;
                    const count = dayEventCounts.get(date) ?? 0;
                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDay(date)}
                        className={`flex flex-1 flex-col items-center rounded-lg py-2.5 transition-all ${
                          isActive
                            ? 'bg-[#4338CA] text-white shadow-[0_2px_8px_rgba(67,56,202,0.3)]'
                            : 'bg-white border border-[rgba(0,0,0,0.06)] text-[#57534E] hover:border-[#E0DCD6]'
                        }`}
                      >
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                          isActive ? 'text-white/60' : 'text-[#A8A29E]'
                        }`}>
                          {dayShort(date)}
                        </span>
                        <span className={`text-[18px] font-bold leading-tight ${
                          isActive ? 'text-white' : 'text-[#292524]'
                        }`}>
                          {dayNum(date)}
                        </span>
                        <span className={`font-[family-name:var(--font-mono)] text-[10px] ${
                          isActive ? 'text-white/60' : 'text-[#A8A29E]'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Filter bar: VIP segmented control + Sector dropdown */}
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  {/* VIP segmented control */}
                  <div className="flex rounded-lg bg-white border border-[#E0DCD6] p-0.5">
                    {VIP_OPTIONS.map((opt) => {
                      const isActive = vipFilter === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setVipFilter(opt.value)}
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                            isActive
                              ? opt.value === 'vip'
                                ? 'bg-[#FFF1F2] text-[#BE123C]'
                                : 'bg-[#EEF2FF] text-[#4338CA]'
                              : 'text-[#A8A29E] hover:text-[#57534E]'
                          }`}
                        >
                          {opt.value === 'vip' && <Flame className="size-2.5" />}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sector dropdown */}
                  <FilterDropdown
                    label="Sector"
                    options={sectorOptions}
                    selected={selectedSectors}
                    onToggle={toggleSector}
                    onClear={() => setSelectedSectors(new Set())}
                  />

                  {/* Clear all filters */}
                  {hasActiveEventFilters && (
                    <button
                      onClick={() => {
                        setVipFilter('all');
                        setSelectedSectors(new Set());
                      }}
                      className="text-[11px] font-semibold text-[#4338CA] hover:text-[#3730A3]"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Results summary */}
                <div className="mb-4 flex items-center gap-3 text-[12px] text-[#A8A29E]">
                  <span>
                    <span className="font-[family-name:var(--font-mono)] font-bold text-[#292524]">{filteredEvents.length}</span>
                    {hasActiveEventFilters && <span> of {totalDayEvents}</span>}
                    {' '}events
                  </span>
                  {dayVipCount > 0 && !hasActiveEventFilters && (
                    <>
                      <span className="text-[#E8E6E3]">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Flame className="size-3 text-[#BE123C]" />
                        <span className="font-[family-name:var(--font-mono)] font-bold text-[#292524]">{dayVipCount}</span> VIP
                      </span>
                    </>
                  )}
                </div>

                {/* Time blocks */}
                {filteredEvents.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-[15px] font-semibold text-[#292524]">No events found</p>
                    <p className="mt-1 text-[13px] text-[#A8A29E]">Try adjusting your filters or search term.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {timeBlocks.map((block) => (
                      <div key={block.time} data-time-block={block.time}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold text-[#4338CA]">{block.time}</span>
                          <div className="h-px flex-1 bg-[#EEF2FF]" />
                          <span className="text-[10px] text-[#A8A29E]">
                            {block.events.length} session{block.events.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {block.events.map((ev) => (
                            <EventRow
                              key={ev.event_id}
                              ev={ev}
                              onDetailOpen={setDetailEvent}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════════ EXHIBITIONS TAB ═══════════════════════════ */}
        {mainTab === 'exhibitions' && (
          <div>
            {/* Category pills (hidden during search) */}
            {!isSearchActive && (
              <div className="mb-3 flex gap-1.5 overflow-x-auto">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'Startup', label: 'Startup' },
                  { value: 'Corporate', label: 'Corporate' },
                  { value: 'Government', label: 'Government' },
                  { value: 'Academia', label: 'Academia' },
                  { value: 'Public Sector Units', label: 'PSU' },
                  { value: 'Country Pavilion', label: 'Country' },
                  { value: 'Research', label: 'Research' },
                ].map((opt) => {
                  const isActive = exCategory === opt.value;
                  const count = opt.value === 'all'
                    ? allExhibitors.length
                    : allExhibitors.filter((e) => e.category === opt.value).length;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setExCategory(opt.value)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                        isActive
                          ? 'bg-[#4338CA] text-white shadow-[0_2px_8px_rgba(67,56,202,0.25)]'
                          : 'bg-white border border-[rgba(0,0,0,0.06)] text-[#57534E] hover:border-[#E0DCD6]'
                      }`}
                    >
                      {opt.label}
                      <span className={`ml-1 font-[family-name:var(--font-mono)] text-[10px] ${isActive ? 'text-white/60' : 'text-[#A8A29E]'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sector filter + clear (hidden during search) */}
            {!isSearchActive && (
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <FilterDropdown
                  label="Sector"
                  options={exSectorOptions}
                  selected={exSelectedSectors}
                  onToggle={toggleExSector}
                  onClear={() => setExSelectedSectors(new Set())}
                />

                {hasActiveExFilters && (
                  <button
                    onClick={() => { setExCategory('all'); setExSelectedSectors(new Set()); }}
                    className="text-[11px] font-semibold text-[#4338CA] hover:text-[#3730A3]"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}

            {/* Results count */}
            <p className="mb-3 text-[12px] text-[#A8A29E]">
              <span className="font-[family-name:var(--font-mono)] font-bold text-[#292524]">{filteredExhibitors.length}</span>
              {(hasActiveExFilters || isSearchActive) && <span> of {allExhibitors.length}</span>}
              {' '}exhibitions
              {isSearchActive && ' matching your search'}
            </p>

            {/* Exhibitor grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filteredExhibitors.slice(0, 60).map((ex) => (
                <div
                  key={ex.id}
                  className="group rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 transition-all hover:border-[#E0DCD6] hover:shadow-sm"
                >
                  {ex.logo_url?.trim() ? (
                    <div className="mb-2 flex h-10 items-center justify-center overflow-hidden rounded-lg bg-[#FAF9F7]">
                      <img src={ex.logo_url} alt={ex.alt_text || ex.name} className="h-8 max-w-full object-contain" loading="lazy" />
                    </div>
                  ) : (
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-[#FAF9F7]">
                      <span className="text-sm font-bold text-[#E8E6E3]">{ex.name.charAt(0)}</span>
                    </div>
                  )}

                  <h4 className="text-[12px] font-semibold text-[#292524] leading-tight">{ex.name}</h4>

                  {ex.one_liner && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#A8A29E]">{ex.one_liner}</p>
                  )}

                  {ex.keywords?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ex.keywords.slice(0, 2).map((k, i) => (
                        <span key={i} className="rounded bg-[#EDEAE5] px-1.5 py-[1px] text-[9px] text-[#A8A29E]">
                          {k.keyword}
                        </span>
                      ))}
                    </div>
                  )}

                  {ex.networking_tip && (
                    <div className="mt-2 hidden group-hover:block">
                      <div className="rounded-md border-l-[2px] border-l-[#059669] bg-[#FAF9F7] px-2.5 py-2">
                        <p className="text-[10px] leading-relaxed text-[#57534E]">{ex.networking_tip}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredExhibitors.length > 60 && (
              <p className="mt-4 text-center text-[12px] text-[#A8A29E]">
                Showing 60 of {filteredExhibitors.length}. Use search to find specific exhibitions.
              </p>
            )}
          </div>
        )}
      </main>

      {/* ── DETAIL BOTTOM SHEET ────────────────────────────────── */}
      {detailEvent && (
        <EventDetailSheet ev={detailEvent} onClose={() => setDetailEvent(null)} />
      )}

      {/* ── FLOATING CTA ──────────────────────────────────────── */}
      <button
        onClick={() => router.push(lastPlanId ? `/plan/${lastPlanId}` : '/quiz')}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4338CA] to-[#6366F1] px-5 py-3 text-[13px] font-bold text-white shadow-[0_4px_20px_rgba(67,56,202,0.4)] transition-all hover:shadow-[0_8px_30px_rgba(67,56,202,0.5)] hover:scale-105 active:scale-95"
      >
        {lastPlanId ? (
          <>
            <CalendarDays className="size-4" />
            My Schedule
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            Generate Schedule
          </>
        )}
      </button>
    </div>
  );
}
