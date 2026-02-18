'use client';

import { Mail } from 'lucide-react';

interface EmailStickyBarProps {
  onClick: () => void;
}

export function EmailStickyBar({ onClick }: EmailStickyBarProps) {
  return (
    <button
      onClick={onClick}
      className="sticky top-[49px] z-30 flex w-full items-center justify-center gap-2 bg-gradient-to-r from-[#4338CA] to-[#6366F1] py-2 text-[12px] font-semibold text-white transition-all hover:from-[#3730A3] hover:to-[#4F46E5] cursor-pointer shadow-sm"
    >
      <Mail className="size-3.5" />
      Get your PDF schedule + post-summit brief &rarr;
    </button>
  );
}
