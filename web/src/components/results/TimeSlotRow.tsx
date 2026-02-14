'use client';

import { ChevronRight } from 'lucide-react';
import type { ScoredEvent } from '@/lib/types';
import { TIER_DOT_COLOR } from '@/lib/tier-styles';
import { EventCard } from './EventCard';
import { CompactEventCard } from './CompactEventCard';

interface TimeSlotRowProps {
  primary: ScoredEvent;
  fallback: ScoredEvent | null;
  alternativesCount: number; // alternatives beyond P2
  index: number;
  isLast: boolean;
  isPast: boolean;
  slotId: string; // original primary event_id (stable across swaps)
  onViewAll: (eventId: string) => void;
  onDetailOpen: (scoredEvent: ScoredEvent) => void;
}

export function TimeSlotRow({
  primary,
  fallback,
  alternativesCount,
  index,
  isLast,
  isPast,
  slotId,
  onViewAll,
  onDetailOpen,
}: TimeSlotRowProps) {
  const dotColor = TIER_DOT_COLOR[primary.tier] || 'border-[#E0DCD6] bg-white';

  // Show "View alternatives" whenever there's a fallback (user can swap P1)
  // or when there are additional alternatives beyond P2
  const showViewAll = fallback !== null || alternativesCount > 0;

  return (
    <div
      data-event-id={slotId}
      className={`relative pl-6 pb-4${isPast ? ' opacity-50' : ''}`}
    >
      {/* Timeline connector line */}
      {!isLast && (
        <div className="absolute left-[7px] top-7 bottom-0 w-[1.5px] bg-[#E8E6E3]" />
      )}
      {/* Timeline dot */}
      <div
        className={`absolute left-0 top-2 h-4 w-4 rounded-full border-2 bg-white ${dotColor}`}
      />

      {/* P1 - Primary event card */}
      <EventCard
        scoredEvent={primary}
        index={index}
        onDetailOpen={onDetailOpen}
      />

      {/* P2 - Runner-up stacked below */}
      {fallback && (
        <div className="mt-2">
          <CompactEventCard
            scoredEvent={fallback}
            onDetailOpen={onDetailOpen}
          />
        </div>
      )}

      {/* "View alternatives" bar */}
      {showViewAll && (
        <button
          onClick={() => onViewAll(slotId)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#4338CA]/20 bg-[#EEF2FF]/40 px-3 py-2 text-[12px] font-semibold text-[#4338CA] transition-all hover:border-[#4338CA]/40 hover:bg-[#EEF2FF] hover:shadow-sm"
        >
          {alternativesCount > 0
            ? `View ${alternativesCount} ${alternativesCount === 1 ? 'alternative' : 'alternatives'}`
            : 'View alternatives'
          }
          <ChevronRight className="size-3.5" />
        </button>
      )}
    </div>
  );
}
