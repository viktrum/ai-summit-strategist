'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Flame, Calendar, MapPin, Sparkles, Users, Building2, ExternalLink } from 'lucide-react';
import eventsData from '@/data/events.json';
import exhibitorsData from '@/data/exhibitors.json';
import type { Event, Exhibitor } from '@/lib/types';
import { formatTime } from '@/lib/format';

// ---------------------------------------------------------------------------
// Data prep (runs once at module level)
// ---------------------------------------------------------------------------

const events = eventsData as Event[];
const exhibitors = exhibitorsData as Exhibitor[];

const SUMMIT_DATES = ['2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20'];

// Heavy hitters grouped by date
const heavyHittersByDate = new Map<string, Event[]>();
for (const e of events) {
  if (!e.networking_signals.is_heavy_hitter) continue;
  if (!heavyHittersByDate.has(e.date)) heavyHittersByDate.set(e.date, []);
  heavyHittersByDate.get(e.date)!.push(e);
}
// Sort each day's events by time
for (const [, dayEvents] of heavyHittersByDate) {
  dayEvents.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
}

// Top exhibitors with logos (pick ones with real logo URLs, skip ministries for visual variety)
const featuredExhibitors = exhibitors
  .filter((e) => e.logo_url && !e.name.startsWith('Ministry'))
  .slice(0, 12);

// All exhibitor logos for logo wall
const allLogos = exhibitors
  .filter((e) => e.logo_url)
  .slice(0, 24);

// Today or first upcoming summit date
function getActiveDate(): string {
  const today = new Date().toISOString().slice(0, 10);
  for (const d of SUMMIT_DATES) {
    if (d >= today) return d;
  }
  return SUMMIT_DATES[0]; // fallback to first day
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Home() {
  const router = useRouter();
  const activeDate = getActiveDate();
  const todayHeavyHitters = heavyHittersByDate.get(activeDate) || [];

  return (
    <div className="min-h-screen bg-[#EEEBE6]">
      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #1A1A19 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative mx-auto max-w-[780px] px-5 pb-14 pt-10 sm:pt-16 sm:pb-16">
          {/* Summit logo + overline */}
          <a
            href="https://impact.indiaai.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <img
              src="https://impact.indiaai.gov.in/ai-impact-logo.png"
              alt="India AI Impact Summit 2026"
              className="h-10 w-auto sm:h-12"
            />
            <div className="h-8 w-px bg-[#E0DCD6]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#A8A29E]">
              Feb 16–20, 2026
            </p>
          </a>

          {/* Headline */}
          <h1 className="mb-5 text-[28px] font-black leading-[1.15] tracking-tight text-[#1A1A19] sm:text-[44px]">
            463 sessions. 5 days.
            <br />
            Up to 15 running at the same time.
          </h1>

          {/* Subheadline */}
          <p className="mb-8 max-w-[440px] text-[15px] leading-relaxed text-[#57534E]">
            Tell us about yourself. We&apos;ll pick the right sessions for you.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => router.push('/quiz')}
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#4338CA] to-[#6366F1] px-7 py-4 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(67,56,202,0.25)] transition-all hover:shadow-[0_8px_30px_rgba(67,56,202,0.35)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="size-5" />
              Generate Personalised Schedule
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => router.push('/explore')}
              className="group inline-flex items-center gap-2.5 rounded-2xl border-2 border-[#E0DCD6] bg-white px-7 py-4 text-[15px] font-bold text-[#292524] transition-all hover:border-[#4338CA]/30 hover:bg-[#EEF2FF] active:scale-[0.98]"
            >
              Explore Events & Exhibitions
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Stats */}
          <div className="mt-10 flex gap-8">
            {[
              { n: '463', label: 'Events' },
              { n: '715', label: 'Exhibitions' },
              { n: '31', label: 'VIP Sessions' },
              { n: '5', label: 'Days' },
            ].map((s) => (
              <div key={s.label}>
                <span className="block font-[family-name:var(--font-mono)] text-[22px] font-black text-[#1A1A19]">{s.n}</span>
                <span className="text-[11px] font-medium text-[#A8A29E]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade into page bg */}
        <div className="h-6 bg-gradient-to-b from-white to-[#EEEBE6]" />
      </section>

      {/* ── HEAVY HITTERS PREVIEW ───────────────────────────────── */}
      <section id="vip-sessions" className="scroll-mt-16 mx-auto max-w-[780px] px-5 py-12">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-[#292524] sm:text-[24px]">
              <Flame className="mr-1.5 inline size-5 text-[#BE123C]" />
              VIP Sessions
            </h2>
            <p className="mt-1 text-[13px] text-[#A8A29E]">
              Heavy hitters for {formatDateLabel(activeDate)}
            </p>
          </div>
          <button
            onClick={() => router.push('/explore?tab=vip')}
            className="text-[13px] font-semibold text-[#4338CA] hover:text-[#3730A3] transition-colors"
          >
            See all 31 →
          </button>
        </div>

        {todayHeavyHitters.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {todayHeavyHitters.slice(0, 6).map((event) => (
              <div
                key={event.event_id}
                className="group rounded-xl border border-[#FFC9C9]/50 bg-[#FFFBF9] p-4 transition-all hover:shadow-[0_4px_12px_rgba(190,18,60,0.08)] hover:border-[#FFC9C9]"
              >
                {/* Badge + time */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FFF1F2] to-[#FECDD3] px-2 py-0.5 text-[10px] font-bold text-[#BE123C]">
                    <Flame className="size-2.5" />
                    VIP
                  </span>
                  <span className="ml-auto font-[family-name:var(--font-mono)] text-[11px] text-[#A8A29E]">
                    {formatTime(event.start_time)}
                    {event.end_time && ` – ${formatTime(event.end_time)}`}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mb-1.5 text-[14px] font-bold leading-snug text-[#292524] line-clamp-2">
                  {event.title}
                </h3>

                {/* One-liner */}
                {event.summary_one_liner && (
                  <p className="mb-2 text-[12px] leading-relaxed text-[#A8A29E] line-clamp-2">
                    {event.summary_one_liner}
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-3 text-[11px] text-[#A8A29E]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {event.venue}
                  </span>
                  {event.speakers && (
                    <span className="inline-flex items-center gap-1 truncate">
                      <Users className="size-3" />
                      {event.speakers.split(';').filter(Boolean).length} speakers
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[#E0DCD6] bg-[#FAF9F7] p-8 text-center">
            <p className="text-[13px] text-[#A8A29E]">No VIP sessions scheduled for this date.</p>
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-16 mx-auto max-w-[780px] px-5 py-8">
        <h2 className="mb-6 text-center text-[20px] font-bold text-[#292524] sm:text-[24px]">
          How it works
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { step: '1', title: 'Take the quiz', desc: '9 quick questions about your role, interests, and goals.', icon: '🎯' },
            { step: '2', title: 'We crunch 463 events', desc: 'Our scoring engine finds the sessions with highest networking ROI for you.', icon: '⚡' },
            { step: '3', title: 'Get your schedule', desc: 'A shareable, day-by-day itinerary with icebreakers and strategy tips.', icon: '📋' },
          ].map((s) => (
            <div key={s.step} className="rounded-xl bg-white border border-[#E0DCD6] p-5 text-center">
              <span className="mb-2 block text-[28px]">{s.icon}</span>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">Step {s.step}</span>
              <h3 className="mb-1 text-[14px] font-bold text-[#292524]">{s.title}</h3>
              <p className="text-[12px] leading-relaxed text-[#A8A29E]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── EXHIBITOR LOGO WALL ─────────────────────────────────── */}
      <section id="exhibitions" className="scroll-mt-16 mx-auto max-w-[780px] px-5 py-12">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-[#292524] sm:text-[24px]">
              <Building2 className="mr-1.5 inline size-5 text-[#57534E]" />
              Exhibitions
            </h2>
            <p className="mt-1 text-[13px] text-[#A8A29E]">
              715 organizations at the expo
            </p>
          </div>
          <button
            onClick={() => router.push('/explore?tab=exhibitions')}
            className="text-[13px] font-semibold text-[#4338CA] hover:text-[#3730A3] transition-colors"
          >
            See all 715 →
          </button>
        </div>

        {/* Logo grid */}
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {allLogos.map((ex) => (
            <div
              key={ex.id}
              className="flex aspect-square items-center justify-center rounded-xl border border-[#E0DCD6] bg-white p-3 transition-all hover:shadow-sm hover:border-[#D5D0C8]"
              title={ex.name}
            >
              <img
                src={ex.logo_url}
                alt={ex.alt_text || ex.name}
                className="h-8 w-auto max-w-full object-contain opacity-70 transition-opacity hover:opacity-100"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[12px] text-[#A8A29E]">
          + {exhibitors.length - allLogos.length} more exhibitions
        </p>
      </section>

      {/* ── BOTTOM CTAs ───────────────────────────────────────── */}
      <section className="mx-auto max-w-[780px] px-5 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Personalise */}
          <button
            onClick={() => router.push('/quiz')}
            className="group rounded-2xl bg-gradient-to-br from-[#4338CA] to-[#6366F1] p-6 text-left transition-all hover:shadow-[0_8px_30px_rgba(67,56,202,0.35)] hover:scale-[1.01] active:scale-[0.99]"
          >
            <Sparkles className="mb-3 size-6 text-[#A5B4FC]" />
            <h3 className="mb-1 text-[16px] font-bold text-white">Generate Personalised Schedule</h3>
            <p className="mb-4 text-[13px] leading-relaxed text-[#C7D2FE]">
              Tell us about yourself and get a day-by-day schedule with alternatives for every time slot.
            </p>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white">
              Take the quiz
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>

          {/* Explore */}
          <button
            onClick={() => router.push('/explore')}
            className="group rounded-2xl border border-[#E0DCD6] bg-white p-6 text-left transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-[#D5D0C8] hover:scale-[1.01] active:scale-[0.99]"
          >
            <Calendar className="mb-3 size-6 text-[#57534E]" />
            <h3 className="mb-1 text-[16px] font-bold text-[#292524]">Explore Events & Exhibitions</h3>
            <p className="mb-4 text-[13px] leading-relaxed text-[#A8A29E]">
              Browse all 463 events and 715 exhibitions. Filter by date, topic, venue, and more.
            </p>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#4338CA]">
              Browse the schedule
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-[780px] px-5 py-10">
        <div className="mb-6 flex items-center justify-center gap-4 text-[12px] text-[#A8A29E]">
          <span>Free · No signup · Takes 30 seconds</span>
          <span className="text-[#D5D0C8]">·</span>
          <a href="#about-creator" className="font-medium text-[#4338CA] hover:text-[#3730A3] transition-colors">
            About the creator
          </a>
        </div>

        {/* About Creator */}
        <div id="about-creator" className="rounded-2xl border border-[#E0DCD6] bg-white p-6 text-center sm:p-8">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">Built by</p>
          <p className="mb-2 text-[18px] font-bold text-[#292524]">Piyush Mayank</p>
          <p className="mx-auto mb-4 max-w-[400px] text-[13px] leading-relaxed text-[#78716C]">
            Built this tool to help attendees navigate the massive India AI Impact Summit and make every conversation count.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://www.linkedin.com/in/piyushmayank/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E0DCD6] px-3 py-1.5 text-[12px] font-semibold text-[#4338CA] transition-all hover:bg-[#EEF2FF] hover:border-[#C7D2FE]"
            >
              LinkedIn
              <ExternalLink className="size-3" />
            </a>
            <a
              href="https://x.com/piyushmayank_"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E0DCD6] px-3 py-1.5 text-[12px] font-semibold text-[#4338CA] transition-all hover:bg-[#EEF2FF] hover:border-[#C7D2FE]"
            >
              Twitter / X
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#D5D0C8]">
          Not affiliated with the India AI Impact Summit. Built as an independent community tool.
        </p>
      </footer>
    </div>
  );
}
