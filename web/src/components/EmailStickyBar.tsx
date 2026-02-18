'use client';

import { Mail } from 'lucide-react';

interface EmailStickyBarProps {
  onClick: () => void;
}

export function EmailStickyBar({ onClick }: EmailStickyBarProps) {
  return (
    <button
      onClick={onClick}
      className="sticky top-[49px] z-30 flex w-full items-center justify-center gap-1.5 bg-gradient-to-r from-[#EEF2FF] to-[#F5F3FF] py-1.5 text-[12px] font-semibold text-[#4338CA] transition-colors hover:from-[#E0E7FF] hover:to-[#EDE9FE] cursor-pointer border-b border-[#4338CA]/10"
    >
      <Mail className="size-3" />
      Get your personalised summit brief &rarr;
    </button>
  );
}
