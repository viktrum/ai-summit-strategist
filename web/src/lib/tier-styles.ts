import { Flame, Star, Target, Lightbulb } from 'lucide-react';
import type { Tier } from '@/lib/types';

export const TIER_STYLES: Record<Tier, { bg: string; text: string; accent: string; gradient: string; cardTint: string }> = {
  'Must Attend': { bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', accent: '#1E40AF', gradient: 'from-[#1E40AF] to-[#3B82F6]', cardTint: '#F8FAFF' },
  'Should Attend': { bg: 'bg-[#EDE9FE]', text: 'text-[#6D28D9]', accent: '#6D28D9', gradient: 'from-[#6D28D9] to-[#8B5CF6]', cardTint: '#FBF9FF' },
  'Nice to Have': { bg: 'bg-[#ECFDF5]', text: 'text-[#047857]', accent: '#047857', gradient: 'from-[#047857] to-[#34D399]', cardTint: '#F7FDFB' },
  Wildcard: { bg: 'bg-[#FFFBEB]', text: 'text-[#B45309]', accent: '#B45309', gradient: 'from-[#B45309] to-[#F59E0B]', cardTint: '#FFFDF5' },
};

export const TIER_ICONS: Record<Tier, typeof Star> = {
  'Must Attend': Flame,
  'Should Attend': Star,
  'Nice to Have': Target,
  Wildcard: Lightbulb,
};

export const TIER_DOT_COLOR: Record<Tier, string> = {
  'Must Attend': 'border-[#1E40AF] bg-[#DBEAFE]',
  'Should Attend': 'border-[#6D28D9] bg-[#EDE9FE]',
  'Nice to Have': 'border-[#047857] bg-[#ECFDF5]',
  Wildcard: 'border-[#B45309] bg-[#FFFBEB]',
};
