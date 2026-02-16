// ============================================================
// AI Summit Strategist - Scoring Engine
// ============================================================

import type {
  Event,
  Exhibitor,
  UserProfile,
  ScoredEvent,
  ScoredExhibitor,
  AlternativeEvent,
  Tier,
  DaySchedule,
  RecommendationPlan,
  Keyword,
} from './types';

// --- Constants ---

// New scoring weights (total positive max = 100)
const MAX_PERSONA_SCORE = 20;
const MAX_KEYWORD_SCORE = 20;
const MAX_GOAL_RELEVANCE_SCORE = 15;
const MAX_NETWORKING_SIGNAL_SCORE = 15;
const MAX_DEPTH_SCORE = 10;
const MAX_SECTOR_SCORE = 10;
const MAX_SENIORITY_SCORE = 10;
const DEAL_BREAKER_PENALTY = -40;

const EXACT_KEYWORD_POINTS = 4;
const CATEGORY_KEYWORD_POINTS = 2;

const EXACT_PERSONA_POINTS = 7;

const EXHIBITOR_MAX_KEYWORD_SCORE = 60;
const EXHIBITOR_EXACT_KEYWORD_POINTS = 10;
const EXHIBITOR_CATEGORY_KEYWORD_POINTS = 5;
const EXHIBITOR_MAX_PERSONA_SCORE = 40;
const EXHIBITOR_EXACT_PERSONA_POINTS = 10;

const TOP_EXHIBITORS = 5;

// Per-day candidate pool: generous pool so greedy scheduler can fill the day
// and still have plenty of alternatives per slot
const CANDIDATES_PER_DAY = 30;
const MAX_ALTERNATIVES_PER_SLOT = 10;
const GAP_THRESHOLD_MINUTES = 60; // Fill gaps longer than 1 hour
const MAX_GAP_FILLS_PER_DAY = 5;

// --- Goal Relevance Mapping ---
// Maps quiz mission IDs to event goal_relevance values

const MISSION_TO_GOAL_MAP: Record<string, string[]> = {
  hiring: ['hiring'],
  fundraising: ['fundraising'],
  sales: ['sales', 'partnerships'],
  upskilling: ['upskilling'],
  networking: ['networking'],
};

// --- Sector to Keyword Category Mapping ---

const SECTOR_CATEGORY_MAP: Record<string, string[]> = {
  developer_tools: ['AI Technology & Architecture'],
  fintech: ['Business & Entrepreneurship'],
  healthcare: ['Social Impact & Inclusion'],
  ecommerce: ['Industry Applications'],
  edtech: ['Skills & Workforce Development'],
  manufacturing: ['Industry Applications'],
  agriculture: ['Social Impact & Inclusion'],
  defense: ['Geopolitics & Global Strategy'],
  media: ['Digital Transformation & Services'],
  government: ['AI Governance & Ethics'],
};

// --- Headline Map ---

const ROLE_HEADLINES: Record<string, string> = {
  founder: 'The Founder Track',
  investor: 'The Investor Track',
  product: 'The Product Leader Track',
  engineer: 'The Engineer Track',
  policy: 'The Policy & Governance Track',
  student: 'The Explorer Track',
};

const ROLE_STRATEGY_NOTES: Record<string, string> = {
  founder:
    'Your schedule prioritizes high-density networking rooms with decision makers, investors, and potential partners. We have identified sessions where you can make the connections that matter most for your venture.',
  investor:
    'Your schedule focuses on deal-flow rich sessions featuring promising startups, government policy shifts, and emerging technology trends. Expect to meet founders, co-investors, and policy makers shaping the AI landscape.',
  product:
    'Your schedule balances implementation-focused sessions with strategic networking opportunities. We have targeted rooms where you can learn from practitioners and connect with potential collaborators.',
  engineer:
    'Your schedule leans into technically deep sessions and research talks while ensuring you still meet the people building cutting-edge AI. Expect a mix of learning and high-quality peer networking.',
  policy:
    'Your schedule is built around governance, regulation, and responsible AI discussions where you will find fellow policy leaders, government officials, and thought leaders shaping AI frameworks.',
  student:
    'Your schedule mixes accessible learning sessions with high-profile keynotes so you can both upskill and start building your professional network in the AI ecosystem.',
};

// --- Scoring Functions ---

/**
 * Calculate keyword match score between event keywords and user keyword interests.
 * Exact keyword match = exactPoints, same category only = categoryPoints.
 * Capped at maxScore.
 */
function computeKeywordScore(
  itemKeywords: Keyword[],
  userKeywords: Keyword[],
  maxScore: number,
  exactPoints: number,
  categoryPoints: number
): number {
  let score = 0;

  for (const userKw of userKeywords) {
    for (const itemKw of itemKeywords) {
      if (
        userKw.keyword.toLowerCase() === itemKw.keyword.toLowerCase() &&
        userKw.category.toLowerCase() === itemKw.category.toLowerCase()
      ) {
        // Exact match on both keyword and category
        score += exactPoints;
      } else if (
        userKw.category.toLowerCase() === itemKw.category.toLowerCase()
      ) {
        // Same category, different keyword
        score += categoryPoints;
      }
    }
  }

  return Math.min(score, maxScore);
}

/**
 * Calculate persona match score.
 * Exact string match = pointsPerMatch per match.
 * Capped at maxScore.
 */
function computePersonaScore(
  itemPersonas: string[],
  userPersonas: string[],
  maxScore: number,
  pointsPerMatch: number
): number {
  let score = 0;

  const normalizedUserPersonas = userPersonas.map((p) => p.toLowerCase());

  for (const persona of itemPersonas) {
    if (normalizedUserPersonas.includes(persona.toLowerCase())) {
      score += pointsPerMatch;
    }
  }

  return Math.min(score, maxScore);
}

/**
 * Calculate goal relevance score.
 * Checks if event's goal_relevance array matches user's missions.
 * If missions is null/empty (user skipped step 4), defaults to ["networking"]
 * and gives half weight.
 */
function computeGoalRelevanceScore(
  eventGoalRelevance: string[],
  userMissions: string[]
): number {
  const isDefaulted = !userMissions || userMissions.length === 0;
  const effectiveMissions = isDefaulted ? ['networking'] : userMissions;
  const weightMultiplier = isDefaulted ? 0.5 : 1.0;

  if (!eventGoalRelevance || eventGoalRelevance.length === 0) {
    return 0;
  }

  const normalizedEventGoals = eventGoalRelevance.map((g) => g.toLowerCase());
  let matchCount = 0;

  for (const mission of effectiveMissions) {
    const goalValues = MISSION_TO_GOAL_MAP[mission.toLowerCase()];
    if (!goalValues) continue;

    for (const goalValue of goalValues) {
      if (normalizedEventGoals.includes(goalValue.toLowerCase())) {
        matchCount++;
        break; // Count each mission only once
      }
    }
  }

  if (matchCount === 0) return 0;

  // Scale: 1 match = 60% of max, 2+ matches = 100% of max
  const rawScore =
    matchCount >= 2 ? MAX_GOAL_RELEVANCE_SCORE : MAX_GOAL_RELEVANCE_SCORE * 0.6;

  return Math.round(rawScore * weightMultiplier);
}

/**
 * Calculate networking signal score based on user's networkingDensity preference.
 * - "high_power": +15 if decision_maker_density === "High" AND is_heavy_hitter, +8 if just one matches
 * - "high_volume": +15 for events at "Bharat Mandapam" main venue, +5 for any other large venue
 * - "balanced" or null: +7.5 flat (half of max, no special boosting)
 */
function computeNetworkingSignalScore(
  event: Event,
  networkingDensity: 'high_power' | 'high_volume' | 'balanced' | undefined | null
): number {
  const preference = networkingDensity || 'balanced';

  if (preference === 'high_power') {
    const isHighDensity =
      event.networking_signals.decision_maker_density === 'High';
    const isHeavyHitter = event.networking_signals.is_heavy_hitter;

    if (isHighDensity && isHeavyHitter) {
      return MAX_NETWORKING_SIGNAL_SCORE; // 15
    } else if (isHighDensity || isHeavyHitter) {
      return 8;
    }
    return 0;
  }

  if (preference === 'high_volume') {
    const venue = (event.venue || '').toLowerCase();
    if (venue.includes('bharat mandapam') && !venue.includes('expo')) {
      return MAX_NETWORKING_SIGNAL_SCORE; // 15
    }
    // Any other large venue (Bharat Mandapam Expo Area, etc.)
    if (venue.includes('bharat mandapam') || venue.includes('expo')) {
      return 5;
    }
    return 0;
  }

  // "balanced" or null/undefined: flat half-max
  return Math.round(MAX_NETWORKING_SIGNAL_SCORE * 0.5); // 7.5 -> 8
}

/**
 * Calculate sector match score.
 * Checks if event keywords match user's selected sectors via category mapping.
 * If sectors is null/empty, returns 0.
 */
function computeSectorScore(
  eventKeywords: Keyword[],
  userSectors: string[] | undefined | null
): number {
  if (!userSectors || userSectors.length === 0) {
    return 0;
  }

  const eventCategories = new Set(
    eventKeywords.map((kw) => kw.category.toLowerCase())
  );

  let matchCount = 0;

  for (const sector of userSectors) {
    const matchingCategories = SECTOR_CATEGORY_MAP[sector.toLowerCase()];
    if (!matchingCategories) continue;

    for (const category of matchingCategories) {
      if (eventCategories.has(category.toLowerCase())) {
        matchCount++;
        break; // Count each sector only once
      }
    }
  }

  if (matchCount === 0) return 0;

  // Scale: 1 match = 50% of max, 2 matches = 80%, 3+ = 100%
  if (matchCount >= 3) return MAX_SECTOR_SCORE;
  if (matchCount === 2) return Math.round(MAX_SECTOR_SCORE * 0.8);
  return Math.round(MAX_SECTOR_SCORE * 0.5);
}

/**
 * Calculate speaker seniority score.
 * Simple heuristic based on title keywords in the speakers string.
 */
function computeSeniorityScore(speakers: string): number {
  if (!speakers) return 0;

  const upper = speakers.toUpperCase();

  // Highest tier: C-suite, Ministers, Secretary-level, Chairman
  const highTitles = ['CEO', 'CTO', 'CXO', 'MINISTER', 'SECRETARY', 'DIRECTOR GENERAL', 'CHAIRMAN', 'CHAIRPERSON'];
  for (const title of highTitles) {
    if (upper.includes(title)) {
      return MAX_SENIORITY_SCORE; // 10
    }
  }

  // Mid tier: VP, Director, Head, Partner
  const midTitles = ['VP', 'VICE PRESIDENT', 'DIRECTOR', 'HEAD', 'PARTNER'];
  for (const title of midTitles) {
    if (upper.includes(title)) {
      return 7;
    }
  }

  // Lower tier: Manager, Lead, Principal
  const lowerTitles = ['MANAGER', 'LEAD', 'PRINCIPAL'];
  for (const title of lowerTitles) {
    if (upper.includes(title)) {
      return 4;
    }
  }

  return 0;
}

/**
 * Calculate deal breaker penalty.
 * Each matching deal breaker applies DEAL_BREAKER_PENALTY (-40). Multiple can stack.
 */
function computeDealBreakerPenalty(
  event: Event,
  dealBreakers: string[] | undefined | null
): number {
  if (!dealBreakers || dealBreakers.length === 0) {
    return 0;
  }

  let penalty = 0;

  for (const breaker of dealBreakers) {
    switch (breaker.toLowerCase()) {
      case 'pure_policy': {
        const hasGovernanceCategory = event.keywords.some(
          (kw) => kw.category.toLowerCase() === 'ai governance & ethics'
        );
        if (hasGovernanceCategory && event.technical_depth <= 2) {
          penalty += DEAL_BREAKER_PENALTY;
        }
        break;
      }
      case 'highly_technical': {
        if (event.technical_depth >= 4) {
          penalty += DEAL_BREAKER_PENALTY;
        }
        break;
      }
      case 'global_south': {
        const hasGlobalSouth = event.keywords.some(
          (kw) => kw.keyword.toLowerCase().includes('global south')
        );
        if (hasGlobalSouth) {
          penalty += DEAL_BREAKER_PENALTY;
        }
        break;
      }
      case 'large_keynote': {
        const sessionType = (event.session_type || '').toLowerCase();
        if (sessionType.includes('keynote') || sessionType.includes('plenary')) {
          penalty += DEAL_BREAKER_PENALTY;
        }
        break;
      }
      case 'sushma_swaraj_bhavan': {
        if ((event.venue || '').toLowerCase().includes('sushma swaraj bhavan')) {
          penalty += DEAL_BREAKER_PENALTY;
        }
        break;
      }
      default:
        break;
    }
  }

  return penalty;
}

/**
 * Score a single event against a user profile.
 * Returns a ScoredEvent with score breakdown. Tier and fallback fields are
 * populated later during plan generation.
 *
 * Scoring weights:
 * - Persona match: 20pts
 * - Keyword/interest match: 20pts
 * - Goal relevance: 15pts
 * - Networking signal match: 15pts
 * - Technical depth fit: 10pts
 * - Sector match: 10pts
 * - Speaker seniority: 10pts
 * - Deal breaker penalty: -40pts per match
 */
export function scoreEvent(event: Event, profile: UserProfile): ScoredEvent {
  const zeroBreakdown = {
    keywordScore: 0,
    personaScore: 0,
    depthScore: 0,
    heavyHitterBonus: 0,
    goalRelevanceScore: 0,
    networkingSignalScore: 0,
    sectorScore: 0,
    dealBreakerPenalty: 0,
  };

  // Hard filter: if the event date is not in the user's available dates, score is 0
  if (!profile.availableDates.includes(event.date)) {
    return {
      event,
      score: 0,
      breakdown: zeroBreakdown,
      tier: 'Wildcard',
      isFallback: false,
    };
  }

  // Keyword matching (20pts max)
  const keywordScore = computeKeywordScore(
    event.keywords,
    profile.keywordInterests,
    MAX_KEYWORD_SCORE,
    EXACT_KEYWORD_POINTS,
    CATEGORY_KEYWORD_POINTS
  );

  // Persona matching (20pts max)
  const personaScore = computePersonaScore(
    event.target_personas,
    profile.personaInterests,
    MAX_PERSONA_SCORE,
    EXACT_PERSONA_POINTS
  );

  // Technical depth (10pts max)
  const depthDiff = Math.abs(
    event.technical_depth - profile.technicalDepthPreference
  );
  let depthScore: number;
  if (depthDiff === 0) {
    depthScore = MAX_DEPTH_SCORE; // 10
  } else if (depthDiff === 1) {
    depthScore = 5;
  } else if (depthDiff === 2) {
    depthScore = 2;
  } else {
    depthScore = 0;
  }

  // Heavy hitter bonus (legacy field, kept for backward compat; now folded into networking signal)
  const heavyHitterBonus = 0;

  // Goal relevance (15pts max)
  const goalRelevanceScore = computeGoalRelevanceScore(
    event.goal_relevance,
    profile.missions
  );

  // Networking signal (15pts max)
  const networkingSignalScore = computeNetworkingSignalScore(
    event,
    profile.networkingDensity
  );

  // Sector match (10pts max)
  const sectorScore = computeSectorScore(event.keywords, profile.sectors);

  // Speaker seniority (10pts max, added to total but not in breakdown as separate named field
  // -- we fold it into networkingSignalScore for simplicity? No, spec says separate.)
  // Actually spec says "Speaker seniority: 10pts (derived)" as a scoring dimension.
  // But the breakdown interface doesn't have a seniorityScore field.
  // We'll add it to the total but report it through the existing dimensions.
  // The spec breakdown fields are: keywordScore, personaScore, depthScore, heavyHitterBonus,
  // goalRelevanceScore, networkingSignalScore, sectorScore, dealBreakerPenalty.
  // Seniority is NOT in the breakdown interface - so we add it to the total directly.
  const seniorityScore = computeSeniorityScore(event.speakers);

  // Deal breaker penalty (negative)
  const dealBreakerPenalty = computeDealBreakerPenalty(
    event,
    profile.dealBreakers
  );

  const totalScore = Math.max(
    0,
    keywordScore +
      personaScore +
      depthScore +
      goalRelevanceScore +
      networkingSignalScore +
      sectorScore +
      seniorityScore +
      dealBreakerPenalty
  );

  return {
    event,
    score: totalScore,
    breakdown: {
      keywordScore,
      personaScore,
      depthScore,
      heavyHitterBonus,
      goalRelevanceScore,
      networkingSignalScore,
      sectorScore,
      dealBreakerPenalty,
    },
    tier: 'Wildcard', // Assigned later during plan generation
    isFallback: false,
  };
}

/**
 * Score a single exhibitor against a user profile.
 */
export function scoreExhibitor(
  exhibitor: Exhibitor,
  profile: UserProfile
): ScoredExhibitor {
  // Keyword matching (60pts max)
  const keywordScore = computeKeywordScore(
    exhibitor.keywords,
    profile.keywordInterests,
    EXHIBITOR_MAX_KEYWORD_SCORE,
    EXHIBITOR_EXACT_KEYWORD_POINTS,
    EXHIBITOR_CATEGORY_KEYWORD_POINTS
  );

  // Persona matching (40pts max)
  const personaScore = computePersonaScore(
    exhibitor.target_personas,
    profile.personaInterests,
    EXHIBITOR_MAX_PERSONA_SCORE,
    EXHIBITOR_EXACT_PERSONA_POINTS
  );

  return {
    exhibitor,
    score: keywordScore + personaScore,
    breakdown: {
      keywordScore,
      personaScore,
    },
  };
}

/**
 * Assign tiers based on score rank within the final selected events.
 * Top 25% = "Must Attend", next 25% = "Should Attend",
 * next 25% = "Nice to Have", bottom 25% = "Wildcard".
 */
function assignTiers(scoredEvents: ScoredEvent[]): ScoredEvent[] {
  // Only assign tiers to primary (non-fallback) events
  const primaries = scoredEvents.filter((e) => !e.isFallback);
  const fallbacks = scoredEvents.filter((e) => e.isFallback);

  // Sort primaries by score descending for tier assignment
  const sorted = [...primaries].sort((a, b) => b.score - a.score);
  const count = sorted.length;

  const tierCutoffs: { threshold: number; tier: Tier }[] = [
    { threshold: Math.ceil(count * 0.25), tier: 'Must Attend' },
    { threshold: Math.ceil(count * 0.5), tier: 'Should Attend' },
    { threshold: Math.ceil(count * 0.75), tier: 'Nice to Have' },
    { threshold: count, tier: 'Wildcard' },
  ];

  for (let i = 0; i < sorted.length; i++) {
    for (const cutoff of tierCutoffs) {
      if (i < cutoff.threshold) {
        sorted[i].tier = cutoff.tier;
        break;
      }
    }
  }

  // Fallbacks always get "Wildcard" tier
  for (const fb of fallbacks) {
    fb.tier = 'Wildcard';
  }

  return [...sorted, ...fallbacks];
}

/**
 * Build an AlternativeEvent object from a ScoredEvent.
 */
function toAlternativeEvent(se: ScoredEvent): AlternativeEvent {
  return {
    event_id: se.event.event_id,
    title: se.event.title,
    tier: 'Wildcard' as Tier, // Alternatives default to Wildcard
    score: se.score,
    venue: se.event.venue,
    room: se.event.room,
    one_liner: se.event.summary_one_liner,
    start_time: se.event.start_time,
    end_time: se.event.end_time,
    speakers: se.event.speakers,
    is_heavy_hitter: se.event.networking_signals.is_heavy_hitter,
  };
}

/**
 * Convert a time string ("HH:MM:SS" or "HH:MM") to minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Check if two events overlap in time.
 * Uses strict inequality so back-to-back events (11:30 end, 11:30 start)
 * are NOT considered overlapping — the user can attend both.
 * If end_time is missing, assumes 30-minute duration.
 */
function timesOverlap(
  startA: string, endA: string | null,
  startB: string, endB: string | null,
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = endA ? timeToMinutes(endA) : aStart + 30;
  const bStart = timeToMinutes(startB);
  const bEnd = endB ? timeToMinutes(endB) : bStart + 30;

  // Strict inequality: aStart < bEnd AND bStart < aEnd
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Resolve time conflicts within a single day using actual time overlap detection.
 *
 * Greedy approach:
 * 1. Sort events by score (highest first)
 * 2. Pick non-overlapping events as primaries (no per-day limit)
 * 3. Assign overlapping events as alternatives on the earliest overlapping primary
 * 4. Top alternative per slot becomes the fallback (P2)
 */
function resolveConflicts(events: ScoredEvent[]): ScoredEvent[] {
  if (events.length === 0) return [];

  // Sort by score descending — greedy picks highest-value events first
  const byScore = [...events].sort((a, b) => b.score - a.score);

  const primaries: ScoredEvent[] = [];
  const assigned = new Set<string>();

  // Phase 1: Greedy non-overlapping primary selection
  for (const se of byScore) {
    const overlaps = primaries.some((p) =>
      timesOverlap(
        p.event.start_time, p.event.end_time,
        se.event.start_time, se.event.end_time,
      )
    );

    if (!overlaps) {
      se.isFallback = false;
      se.alternatives = [];
      primaries.push(se);
      assigned.add(se.event.event_id);
    }
  }

  // Sort primaries chronologically for "first overlapping slot" assignment
  primaries.sort((a, b) =>
    a.event.start_time.localeCompare(b.event.start_time)
  );

  // Phase 2: Assign remaining events as alternatives to their
  // first (earliest) overlapping primary
  for (const se of byScore) {
    if (assigned.has(se.event.event_id)) continue;

    const overlappingPrimary = primaries.find((p) =>
      timesOverlap(
        p.event.start_time, p.event.end_time,
        se.event.start_time, se.event.end_time,
      )
    );

    if (
      overlappingPrimary &&
      overlappingPrimary.alternatives!.length < MAX_ALTERNATIVES_PER_SLOT
    ) {
      overlappingPrimary.alternatives!.push(toAlternativeEvent(se));
      assigned.add(se.event.event_id);
    }
  }

  // Build resolved array: primaries + their fallbacks (P2)
  const resolved: ScoredEvent[] = [];

  for (const primary of primaries) {
    resolved.push(primary);

    // Mark the top alternative as the fallback (P2)
    if (primary.alternatives && primary.alternatives.length > 0) {
      const topAltId = primary.alternatives[0].event_id;
      const topAlt = byScore.find((se) => se.event.event_id === topAltId);

      if (topAlt) {
        topAlt.isFallback = true;
        topAlt.fallbackFor = primary.event.event_id;
        resolved.push(topAlt);
      }
    }
  }

  return resolved;
}

/**
 * Fill time gaps > 1 hour in a day's primaries using the full scored pool.
 * Returns additional ScoredEvents to add as primaries, marked isTimeSlotFill.
 */
function fillTimeGaps(
  primaries: ScoredEvent[],
  allDayScored: ScoredEvent[],
  assignedIds: Set<string>,
): ScoredEvent[] {
  const fills: ScoredEvent[] = [];
  const usedIds = new Set(assignedIds);

  for (let pass = 0; pass < MAX_GAP_FILLS_PER_DAY; pass++) {
    // Sort current primaries + fills chronologically
    const all = [...primaries, ...fills].sort((a, b) =>
      a.event.start_time.localeCompare(b.event.start_time)
    );
    if (all.length === 0) break;

    // Build list of gap windows: between consecutive primaries + after last primary
    const gaps: { startMin: number; endMin: number }[] = [];
    for (let i = 0; i < all.length - 1; i++) {
      const endMin = all[i].event.end_time
        ? timeToMinutes(all[i].event.end_time!)
        : timeToMinutes(all[i].event.start_time) + 30;
      const nextStartMin = timeToMinutes(all[i + 1].event.start_time);
      if (nextStartMin - endMin > GAP_THRESHOLD_MINUTES) {
        gaps.push({ startMin: endMin, endMin: nextStartMin });
      }
    }
    // Gap after last event (until 18:30)
    const lastEvent = all[all.length - 1];
    const lastEndMin = lastEvent.event.end_time
      ? timeToMinutes(lastEvent.event.end_time!)
      : timeToMinutes(lastEvent.event.start_time) + 30;
    const dayEnd = 18 * 60 + 30; // 18:30
    if (dayEnd - lastEndMin > GAP_THRESHOLD_MINUTES) {
      gaps.push({ startMin: lastEndMin, endMin: dayEnd });
    }

    if (gaps.length === 0) break;

    // Try to fill the first gap found
    let gapFound = false;
    for (const gap of gaps) {
      const best = allDayScored
        .filter((se) => {
          if (usedIds.has(se.event.event_id)) return false;
          const startMin = timeToMinutes(se.event.start_time);
          return startMin >= gap.startMin && startMin < gap.endMin;
        })
        .sort((a, b) => b.score - a.score)[0];

      if (best) {
        best.isFallback = false;
        best.isTimeSlotFill = true;
        best.alternatives = [];
        fills.push(best);
        usedIds.add(best.event.event_id);
        gapFound = true;
        break; // Re-scan gaps with updated list
      }
    }

    if (!gapFound) break;
  }

  return fills;
}

/**
 * Generate the full recommendation plan.
 *
 * 1. Score all events, filter out zeros
 * 2. Group by date, take top CANDIDATES_PER_DAY per day
 * 3. Greedy non-overlapping scheduling (no per-day cap)
 * 4. Overlapping events become alternatives with fallback (P2)
 * 4b. Fill time gaps > 1 hour with best available events ("Best at This Time")
 * 5. Assign tiers
 * 6. Score top 5 exhibitors
 * 7. Return full plan
 */
export function generateRecommendations(
  events: Event[],
  exhibitors: Exhibitor[],
  profile: UserProfile
): RecommendationPlan {
  // Step 1: Score all events and filter zeros
  const scored = events
    .map((e) => scoreEvent(e, profile))
    .filter((se) => se.score > 0);

  // Step 2: Group by date, take top candidates per day
  const byDate = new Map<string, ScoredEvent[]>();
  for (const se of scored) {
    const date = se.event.date;
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date)!.push(se);
  }

  let allResolved: ScoredEvent[] = [];

  for (const [, dayEvents] of byDate) {
    // Sort by score, take top candidates for this day
    dayEvents.sort((a, b) => b.score - a.score);
    const dayCandidates = dayEvents.slice(0, CANDIDATES_PER_DAY);

    // Greedy scheduling: picks all non-overlapping primaries,
    // assigns overlapping events as alternatives — no per-day cap
    const resolved = resolveConflicts(dayCandidates);

    // Gap-fill: if primaries have >1hr gaps, fill with best available from full pool
    const primaries = resolved.filter((se) => !se.isFallback);
    const assignedIds = new Set(resolved.map((se) => se.event.event_id));
    // Also include alternative event IDs so we don't double-assign
    for (const se of resolved) {
      if (se.alternatives) {
        for (const alt of se.alternatives) assignedIds.add(alt.event_id);
      }
    }
    const gapFills = fillTimeGaps(primaries, dayEvents, assignedIds);
    allResolved = [...allResolved, ...resolved, ...gapFills];
  }

  // Step 5: Assign tiers
  const tiered = assignTiers(allResolved);

  // Build schedule grouped by date, sorted chronologically
  const scheduleMap = new Map<string, ScoredEvent[]>();
  for (const se of tiered) {
    const date = se.event.date;
    if (!scheduleMap.has(date)) {
      scheduleMap.set(date, []);
    }
    scheduleMap.get(date)!.push(se);
  }

  const schedule: DaySchedule[] = Array.from(scheduleMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayEvents]) => ({
      date,
      events: dayEvents.sort((a, b) =>
        a.event.start_time.localeCompare(b.event.start_time)
      ),
    }));

  // Step 6: Score and rank exhibitors
  const scoredExhibitors = exhibitors
    .map((ex) => scoreExhibitor(ex, profile))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_EXHIBITORS);

  // Step 7: Build the plan
  const totalPrimary = tiered.filter((e) => !e.isFallback).length;

  const headline = ROLE_HEADLINES[profile.role] || 'Your Personalized Track';
  const strategyNote =
    ROLE_STRATEGY_NOTES[profile.role] ||
    'Your schedule has been optimized for the best networking opportunities at the summit.';

  return {
    headline,
    strategyNote,
    schedule,
    exhibitors: scoredExhibitors,
    totalEvents: totalPrimary,
    profile,
  };
}
