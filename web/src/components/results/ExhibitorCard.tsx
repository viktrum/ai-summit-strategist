'use client';

import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import type { ScoredExhibitor } from '@/lib/types';

interface ExhibitorCardProps {
  scoredExhibitor: ScoredExhibitor;
}

export function ExhibitorCard({ scoredExhibitor }: ExhibitorCardProps) {
  const { exhibitor, score, breakdown } = scoredExhibitor;
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      className="group bg-white border border-[rgba(0,0,0,0.06)] rounded-xl p-4 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#E8E6E3] transition-all duration-[250ms] min-w-[250px] sm:min-w-0 cursor-pointer"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      onClick={() => setShowTip((prev) => !prev)}
    >
      <div className="flex flex-col gap-3">
        {/* Logo */}
        {exhibitor.logo_url && exhibitor.logo_url.trim() !== '' ? (
          <div className="flex h-12 w-full items-center justify-center overflow-hidden rounded-lg bg-[#F8F8F7]">
            <img
              src={exhibitor.logo_url}
              alt={exhibitor.alt_text || exhibitor.name}
              className="h-10 w-auto max-w-[180px] object-contain"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex h-12 w-full items-center justify-center rounded-lg bg-[#F8F8F7]">
            <span className="text-lg font-bold text-[#E8E6E3]">
              {exhibitor.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Name */}
        <h4 className="text-[13px] font-semibold leading-tight text-[#1A1A19]">
          {exhibitor.name}
        </h4>

        {/* One-liner */}
        {exhibitor.one_liner && (
          <p className="line-clamp-2 text-xs leading-relaxed text-[#5C5C5A]">
            {exhibitor.one_liner}
          </p>
        )}

        {/* Score and breakdown */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center bg-[#F0EFED] text-[#5C5C5A] rounded-md text-xs font-[family-name:var(--font-mono)] px-2 py-[3px]">
            Score: {score}
          </span>
          <div className="flex gap-1 text-[10px] text-[#8A8A87]">
            <span>K:{breakdown.keywordScore}</span>
            <span>/</span>
            <span>P:{breakdown.personaScore}</span>
          </div>
        </div>

        {/* Networking tip - revealed on hover/click */}
        {exhibitor.networking_tip && showTip && (
          <div className="animate-fade-in bg-[#F8F8F7] rounded-md p-2.5 border-l-[3px] border-l-[#059669]">
            <div className="mb-1 flex items-center gap-1">
              <Lightbulb className="size-3 text-[#059669]" />
              <span className="text-[10px] font-semibold uppercase text-[#8A8A87]">
                Tip
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#5C5C5A]">
              {exhibitor.networking_tip}
            </p>
          </div>
        )}

        {/* Hover hint */}
        {exhibitor.networking_tip && !showTip && (
          <p className="text-[10px] text-[#E8E6E3] transition-opacity group-hover:text-[#8A8A87]">
            Tap for networking tip
          </p>
        )}
      </div>
    </div>
  );
}
