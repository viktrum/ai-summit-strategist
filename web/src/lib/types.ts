// ============================================================
// AI Summit Strategist - Type Definitions
// ============================================================

// --- Shared Types ---

export interface Keyword {
  category: string;
  keyword: string;
}

export type DecisionMakerDensity = 'High' | 'Medium' | 'Low';
export type InvestorPresence = 'Likely' | 'Unlikely';

export interface NetworkingSignals {
  is_heavy_hitter: boolean;
  decision_maker_density: DecisionMakerDensity;
  investor_presence: InvestorPresence;
}

// --- Event ---

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string; // 'YYYY-MM-DD'
  start_time: string; // 'HH:MM:SS.sss'
  end_time: string | null;
  venue: string;
  room: string;
  speakers: string; // semicolon-separated
  knowledge_partners: string;
  session_type: string;
  event_id: string;
  add_to_calendar: boolean;
  notes: string | null;
  summary_one_liner: string;
  technical_depth: number; // 1-5
  target_personas: string[];
  networking_signals: NetworkingSignals;
  keywords: Keyword[];
  goal_relevance: string[];
  icebreaker: string;
  networking_tip: string;
  logo_urls: string[];
}

// --- Exhibitor ---

export interface Exhibitor {
  id: number;
  name: string;
  logo_url: string;
  alt_text: string;
  keywords: Keyword[];
  target_personas: string[];
  goal_relevance: string[];
  one_liner: string;
  networking_tip: string;
  category: string;
  subCategory: string;
}

// --- User Profile ---

export type UserRole =
  | 'founder'
  | 'investor'
  | 'product'
  | 'engineer'
  | 'policy'
  | 'student';

export interface UserProfile {
  name?: string;
  role: UserRole;
  focusAreas: string[]; // max 3
  missions: string[]; // max 2
  availableDates: string[]; // ['2026-02-16', ...]
  // Derived from quiz answers:
  technicalDepthPreference: number;
  keywordInterests: Keyword[];
  personaInterests: string[];
  // Expanded quiz fields (steps 5-9):
  networkingDensity?: 'high_power' | 'high_volume' | 'balanced';
  orgSize?: string;
  sectors?: string[];
  dealBreakers?: string[];
}

// --- Scoring & Recommendations ---

export type Tier = 'Must Attend' | 'Should Attend' | 'Nice to Have' | 'Wildcard';

export interface AlternativeEvent {
  event_id: string;
  title: string;
  tier: Tier;
  score: number;
  venue: string;
  room: string;
  one_liner: string;
  start_time: string;
  end_time: string | null;
  speakers: string;
  is_heavy_hitter: boolean;
}

export interface ScoredEvent {
  event: Event;
  score: number; // 0-100+
  breakdown: {
    keywordScore: number; // 0-20
    personaScore: number; // 0-20
    depthScore: number; // 0-10
    heavyHitterBonus: number; // legacy, now folded into networkingSignalScore
    goalRelevanceScore: number; // 0-15
    networkingSignalScore: number; // 0-15
    sectorScore: number; // 0-10
    dealBreakerPenalty: number; // 0 or negative (multiples of -40)
  };
  tier: Tier;
  isFallback: boolean;
  fallbackFor?: string; // event_id of the primary event this is a fallback for
  isManual?: boolean; // manually added from Explore page
  isTimeSlotFill?: boolean; // gap-fill event ("Best at This Time")
  alternatives?: AlternativeEvent[];
}

export interface PlanEdits {
  pinned: string[];
  dismissed: string[];
  swapped: Record<string, string>; // slot key -> new event_id
}

// Slim event entry stored in Supabase (no full event data — hydrated from static JSON)
export interface SavedPlanEvent {
  id: number; // Event.id — the unique key
  tier: Tier;
  score: number;
  pinned: boolean;
  is_fallback: boolean;
  fallback_for: number | null; // id of the primary event this is a fallback for
  is_manual?: boolean; // manually added from Explore page
  is_time_slot_fill?: boolean; // gap-fill event ("Best at This Time")
}

export interface ScoredExhibitor {
  exhibitor: Exhibitor;
  score: number; // 0-100
  breakdown: {
    keywordScore: number; // 0-60
    personaScore: number; // 0-40
  };
}

export interface DaySchedule {
  date: string;
  events: ScoredEvent[];
}

export interface RecommendationPlan {
  headline: string;
  strategyNote: string;
  schedule: DaySchedule[];
  exhibitors: ScoredExhibitor[];
  totalEvents: number;
  profile: UserProfile;
}
