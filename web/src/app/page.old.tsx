'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import eventsData from '@/data/events.json';
import type { Event } from '@/lib/types';

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Home() {
  const router = useRouter();

  const events = eventsData as Event[];
  const featuredEvents = events
    .filter(e => e.networking_signals.is_heavy_hitter)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || ''))
    .slice(0, 6);

  function handleBuildStrategy() {
    router.push('/quiz');
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <main className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center px-6 py-16 sm:py-24 md:max-w-[680px] lg:max-w-[780px]">
        {/* Hero Section */}
        <div className="animate-fade-in-up text-center">
          {/* Overline */}
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.1em] text-[#8A8A87]">
            India AI Impact Summit 2026
          </p>

          {/* Headline */}
          <h1 className="mb-4 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight text-[#1A1A19] md:text-[2.75rem]">
            Don&apos;t Waste Your Time
            <br />
            at the India AI Summit
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-12 max-w-md text-[15px] leading-relaxed text-[#5C5C5A]">
            463 events. 715 exhibitions. 5 days. We&apos;ll build your
            personalized networking strategy in 30 seconds.
          </p>
        </div>

        {/* CTA Button */}
        <div className="animate-fade-in-up mb-16">
          <button
            onClick={handleBuildStrategy}
            className="group inline-flex items-center rounded-lg bg-[#4338CA] px-6 py-4 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-[#3730A3] active:scale-[0.97]"
          >
            Build My Strategy
            <ArrowRight className="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="stagger-fade-in mb-16 grid w-full max-w-md grid-cols-3 gap-3">
          <div className="rounded-lg bg-[#F8F8F7] p-4 text-center">
            <span className="block font-mono text-[22px] font-bold text-[#1A1A19]">463</span>
            <span className="text-xs text-[#8A8A87]">Events</span>
          </div>
          <div className="rounded-lg bg-[#F8F8F7] p-4 text-center">
            <span className="block font-mono text-[22px] font-bold text-[#1A1A19]">715</span>
            <span className="text-xs text-[#8A8A87]">Exhibitions</span>
          </div>
          <div className="rounded-lg bg-[#F8F8F7] p-4 text-center">
            <span className="block font-mono text-[22px] font-bold text-[#1A1A19]">31</span>
            <span className="text-xs text-[#8A8A87]">Heavy Hitters</span>
          </div>
        </div>

        {/* Explore Events Section */}
        <div className="mb-16 w-full">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-[22px] font-bold tracking-tight text-[#1A1A19] md:text-[28px]">
              Explore the Summit
            </h2>
            <p className="text-[15px] text-[#5C5C5A]">
              Browse all 463 events, filter by topic, venue, and more
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredEvents.map((event) => (
              <div
                key={event.event_id}
                className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 transition-shadow duration-200 hover:shadow-[var(--shadow-sm)]"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-[#FFF1F2] px-2 py-[3px] text-xs font-semibold text-[#BE123C]">
                    Heavy Hitter
                  </span>
                </div>
                <h3
                  className="mb-2 truncate text-[13px] font-semibold text-[#1A1A19]"
                  title={event.title}
                >
                  {event.title}
                </h3>
                <div className="flex items-center gap-3 text-[12px] text-[#8A8A87]">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatDateShort(event.date)}
                  </span>
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="size-3 shrink-0" />
                    {event.venue}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a
              href="/explore"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#4338CA] transition-colors duration-200 hover:text-[#3730A3]"
            >
              View All Events
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="animate-fade-in text-center text-[13px] text-[#8A8A87]">
          Free. No signup required. Takes 30 seconds.
        </p>
      </main>
    </div>
  );
}
