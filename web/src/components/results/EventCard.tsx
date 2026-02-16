'use client';

import { Flame } from 'lucide-react';
import type { ScoredEvent } from '@/lib/types';
import { TIER_STYLES, TIER_ICONS } from '@/lib/tier-styles';
import { formatTime, parseSpeakers } from '@/lib/format';
import { getEnrichedLogos } from '@/lib/logo-lookup';

interface EventCardProps {
  scoredEvent: ScoredEvent;
  index: number;
  onDetailOpen?: (scoredEvent: ScoredEvent) => void;
}

export { formatTime } from '@/lib/format';

export function EventCard({
  scoredEvent,
  index,
  onDetailOpen,
}: EventCardProps) {
  const { event, tier } = scoredEvent;
  const tierStyle = TIER_STYLES[tier];
  const TierIcon = TIER_ICONS[tier];
  const speakers = parseSpeakers(event.speakers);
  const isHeavyHitter = event.networking_signals.is_heavy_hitter;
  const allLogos = getEnrichedLogos(event.speakers, event.knowledge_partners, event.logo_urls ?? []);
  const hasLogos = allLogos.length > 0;

  return (
    <div
      className={`relative rounded-xl overflow-hidden transition-all duration-[250ms] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
        isHeavyHitter
          ? 'border border-[#FFC9C9] shadow-[0_2px_8px_rgba(190,18,60,0.06)]'
          : 'border border-[#E0DCD6] shadow-[0_2px_6px_rgba(0,0,0,0.04)]'
      }`}
      style={{
        backgroundColor: isHeavyHitter ? '#FFFBF9' : tierStyle.cardTint,
        animationName: 'fadeInUp',
        animationDuration: '0.5s',
        animationTimingFunction: 'ease-out',
        animationFillMode: 'forwards',
        animationDelay: `${index * 0.08}s`,
        opacity: 0,
      }}
    >
      {/* Tier accent strip */}
      <div className={`h-1 bg-gradient-to-r ${tierStyle.gradient}`} />

      {/* Card body — clickable to open detail sheet */}
      <button
        onClick={() => onDetailOpen?.(scoredEvent)}
        className="w-full p-4 px-5 text-left"
      >
        {/* Top row: time + badges */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold" style={{ color: tierStyle.accent }}>
            {formatTime(event.start_time)}
            {event.end_time && ` – ${formatTime(event.end_time)}`}
          </span>
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${tierStyle.bg} ${tierStyle.text}`}>
            <TierIcon className="size-2.5" />
            {tier}
          </span>
          {isHeavyHitter && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FFF1F2] to-[#FECDD3] text-[#BE123C]">
              <Flame className="size-2.5" />
              VIP
            </span>
          )}
          {scoredEvent.isManual && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EDEAE5] text-[#78716C]">
              Manually Added
            </span>
          )}
          {scoredEvent.isTimeSlotFill && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0F9FF] text-[#0369A1]">
              Best at This Time
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold text-[#292524] leading-snug line-clamp-2 mb-1.5">
          {event.title}
        </h3>

        {/* Venue */}
        <p className="text-[11px] text-[#A8A29E] mb-3">
          {event.venue}{event.room ? ` · ${event.room}` : ''}
          {event.networking_signals?.decision_maker_density === 'High' && (
            <span className="ml-2 rounded bg-[#FFFBEB] px-1.5 py-[1px] text-[9px] font-semibold text-[#D97706]">
              High-value room
            </span>
          )}
        </p>

        {/* Smart content: VIP → speakers, Non-VIP → keywords/sectors */}
        {isHeavyHitter ? (
          /* VIP: speakers one per line, up to 3, +X more */
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
          /* Non-VIP: keyword/sector tags */
          event.keywords && event.keywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {event.keywords.slice(0, 3).map((kw, i) => (
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

        {/* Company logos — large and prominent, always shown */}
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
