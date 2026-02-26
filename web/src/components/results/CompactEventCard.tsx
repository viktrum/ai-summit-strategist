'use client';

import { Flame, MapPin, Clock } from 'lucide-react';
import type { ScoredEvent } from '@/lib/types';
import { TIER_STYLES, TIER_ICONS } from '@/lib/tier-styles';
import { formatTime } from '@/lib/format';

interface CompactEventCardProps {
  scoredEvent: ScoredEvent;
  onDetailOpen: (scoredEvent: ScoredEvent) => void;
}

export function CompactEventCard({ scoredEvent, onDetailOpen }: CompactEventCardProps) {
  const { event, tier } = scoredEvent;
  const tierStyle = TIER_STYLES[tier];
  const TierIcon = TIER_ICONS[tier];
  const isHeavyHitter = event.networking_signals.is_heavy_hitter;

  return (
    <button
      onClick={() => onDetailOpen(scoredEvent)}
      className="w-full rounded-lg border border-[#E8E6E3] bg-[#FAF9F7] px-4 py-2.5 text-left transition-all hover:border-[#D5D0C8] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
    >
      {/* Top row: badges + runner-up label */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-[1px] rounded-full ${tierStyle.bg} ${tierStyle.text}`}>
          <TierIcon className="size-2" />
          {tier}
        </span>
        {isHeavyHitter && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-[1px] rounded-full bg-gradient-to-r from-[#FFF1F2] to-[#FECDD3] text-[#BE123C]">
            <Flame className="size-2" />
            VIP
          </span>
        )}
        <span className="text-[9px] font-medium text-[#A8A29E] ml-auto">Runner-up</span>
      </div>

      {/* Title - 1 line clamp */}
      <h4 className="text-[13px] font-semibold text-[#57534E] leading-snug line-clamp-1">
        {event.title}
      </h4>

      {/* Meta row */}
      <div className="mt-1 flex items-center gap-2 text-[10px] text-[#A8A29E]">
        <span className="inline-flex items-center gap-0.5">
          <Clock className="size-2.5" />
          {formatTime(event.start_time)}
        </span>
        <span className="inline-flex items-center gap-0.5 truncate">
          <MapPin className="size-2.5" />
          {event.venue}{event.room ? ` · ${event.room}` : ''}
        </span>
      </div>
    </button>
  );
}
