// ============================================================
// AI Summit Strategist - Quiz Answer to Profile Mapper
// ============================================================

import type { Keyword, UserProfile, UserRole } from './types';

// --- Role Mapping ---
// Each role maps to a default technical depth, relevant personas, and base keywords.

interface RoleMapping {
  depth: number;
  personas: string[];
  keywords: Keyword[];
}

export const ROLE_MAP: Record<UserRole, RoleMapping> = {
  founder: {
    depth: 3,
    personas: [
      'Early-Stage Founders',
      'Growth-Stage Founders',
      'Technical Founders',
    ],
    keywords: [
      { category: 'Business & Entrepreneurship', keyword: 'Startups' },
    ],
  },
  investor: {
    depth: 2,
    personas: ['Investors & Venture Capital', 'C-Suite Executives'],
    keywords: [
      { category: 'Business & Entrepreneurship', keyword: 'Venture Capital' },
    ],
  },
  product: {
    depth: 3,
    personas: ['Product Managers', 'Innovation & Strategy Leaders'],
    keywords: [
      {
        category: 'Digital Transformation & Services',
        keyword: 'Digital Transformation',
      },
    ],
  },
  engineer: {
    depth: 4,
    personas: ['AI/ML Engineers', 'Backend Engineers', 'Data Scientists'],
    keywords: [
      {
        category: 'AI Technology & Architecture',
        keyword: 'AI Architecture',
      },
    ],
  },
  policy: {
    depth: 2,
    personas: ['Government & Policy Leaders', 'Policy & Regulatory Experts'],
    keywords: [
      { category: 'AI Governance & Ethics', keyword: 'AI Governance' },
    ],
  },
  student: {
    depth: 3,
    personas: ['Students & Early Career', 'AI Researchers'],
    keywords: [
      { category: 'Skills & Workforce Development', keyword: 'AI Literacy' },
    ],
  },
};

// --- Focus Area Mapping ---
// Each focus area adds domain-specific keywords to the profile.
// Keys match the new quiz interest IDs from the expanded 9-step quiz.

export const FOCUS_MAP: Record<string, Keyword[]> = {
  // New ID-based keys (from expanded quiz)
  llms_foundation: [
    { category: 'AI Technology & Architecture', keyword: 'Generative AI' },
    {
      category: 'AI Technology & Architecture',
      keyword: 'Large Language Models',
    },
    { category: 'AI Technology & Architecture', keyword: 'Foundation Models' },
  ],
  agentic_ai: [
    { category: 'AI Technology & Architecture', keyword: 'Agentic AI' },
    { category: 'AI Technology & Architecture', keyword: 'Autonomous Systems' },
  ],
  compute_infra: [
    { category: 'Data & Infrastructure', keyword: 'Cloud Computing' },
    { category: 'Data & Infrastructure', keyword: 'Semiconductor' },
    { category: 'Data & Infrastructure', keyword: 'AI Infrastructure' },
  ],
  safety_governance: [
    { category: 'AI Governance & Ethics', keyword: 'AI Safety' },
    { category: 'AI Governance & Ethics', keyword: 'Responsible AI' },
    { category: 'AI Governance & Ethics', keyword: 'Ethical AI' },
  ],
  startups_vc: [
    { category: 'Business & Entrepreneurship', keyword: 'Startups' },
    { category: 'Business & Entrepreneurship', keyword: 'Venture Capital' },
    { category: 'Research & Innovation', keyword: 'Innovation' },
  ],
  enterprise_ai: [
    { category: 'Industry Applications', keyword: 'Enterprise AI' },
    {
      category: 'Digital Transformation & Services',
      keyword: 'Digital Transformation',
    },
    { category: 'Data & Infrastructure', keyword: 'Cloud Computing' },
  ],
  health_agri_impact: [
    { category: 'Social Impact & Inclusion', keyword: 'Social Impact' },
    { category: 'Social Impact & Inclusion', keyword: 'Education' },
    { category: 'Geopolitics & Global Strategy', keyword: 'Global South' },
  ],
  geopolitics: [
    { category: 'Geopolitics & Global Strategy', keyword: 'Global South' },
    {
      category: 'Geopolitics & Global Strategy',
      keyword: 'Digital Sovereignty',
    },
    { category: 'AI Governance & Ethics', keyword: 'AI Governance' },
  ],

  // Legacy label-based keys (backward compatibility with old quiz)
  'LLMs & GenAI': [
    { category: 'AI Technology & Architecture', keyword: 'Generative AI' },
    {
      category: 'AI Technology & Architecture',
      keyword: 'Large Language Models',
    },
    { category: 'AI Technology & Architecture', keyword: 'Foundation Models' },
  ],
  'Compute, Cloud & Infra': [
    { category: 'Data & Infrastructure', keyword: 'Cloud Computing' },
    { category: 'Data & Infrastructure', keyword: 'Semiconductor' },
    { category: 'Data & Infrastructure', keyword: 'AI Infrastructure' },
  ],
  'Ethics, Safety & Governance': [
    { category: 'AI Governance & Ethics', keyword: 'AI Safety' },
    { category: 'AI Governance & Ethics', keyword: 'Responsible AI' },
    { category: 'AI Governance & Ethics', keyword: 'Ethical AI' },
  ],
  'Startups & Venture Capital': [
    { category: 'Business & Entrepreneurship', keyword: 'Startups' },
    { category: 'Business & Entrepreneurship', keyword: 'Venture Capital' },
    { category: 'Research & Innovation', keyword: 'Innovation' },
  ],
  'Enterprise Adoption': [
    { category: 'Industry Applications', keyword: 'Enterprise AI' },
    {
      category: 'Digital Transformation & Services',
      keyword: 'Digital Transformation',
    },
    { category: 'Data & Infrastructure', keyword: 'Cloud Computing' },
  ],
  'Social Impact': [
    { category: 'Social Impact & Inclusion', keyword: 'Social Impact' },
    { category: 'Social Impact & Inclusion', keyword: 'Education' },
    { category: 'Geopolitics & Global Strategy', keyword: 'Global South' },
  ],
};

// --- Mission Mapping ---
// Each mission adds goal-oriented keywords to the profile.

export const MISSION_MAP: Record<string, Keyword[]> = {
  // New ID-based keys (from expanded quiz)
  hiring: [
    {
      category: 'Skills & Workforce Development',
      keyword: 'Talent Development',
    },
  ],
  fundraising: [
    { category: 'Business & Entrepreneurship', keyword: 'Venture Capital' },
    { category: 'Business & Entrepreneurship', keyword: 'Startups' },
  ],
  sales: [
    { category: 'Industry Applications', keyword: 'Enterprise AI' },
    {
      category: 'Digital Transformation & Services',
      keyword: 'Digital Transformation',
    },
  ],
  upskilling: [
    { category: 'Skills & Workforce Development', keyword: 'AI Literacy' },
    { category: 'Research & Innovation', keyword: 'AI Research' },
  ],
  networking: [
    // No additional keywords. The "Networking" mission signals intent to
    // prioritize heavy hitter events, which is handled by the scoring engine's
    // networking signal scoring. No extra keyword injection needed.
  ],

  // Legacy label-based keys (backward compatibility with old quiz)
  'Finding Talent': [
    {
      category: 'Skills & Workforce Development',
      keyword: 'Talent Development',
    },
  ],
  Fundraising: [
    { category: 'Business & Entrepreneurship', keyword: 'Venture Capital' },
    { category: 'Business & Entrepreneurship', keyword: 'Startups' },
  ],
  'Finding Customers': [
    { category: 'Industry Applications', keyword: 'Enterprise AI' },
    {
      category: 'Digital Transformation & Services',
      keyword: 'Digital Transformation',
    },
  ],
  'Deep Learning': [
    { category: 'Skills & Workforce Development', keyword: 'AI Literacy' },
    { category: 'Research & Innovation', keyword: 'AI Research' },
  ],
  Networking: [
    // No additional keywords - see networking above.
  ],
};

// --- Sector Mapping ---
// Maps sector IDs from expanded quiz step 8 to keyword interests.

export const SECTOR_MAP: Record<string, Keyword[]> = {
  developer_tools: [
    { category: 'AI Technology & Architecture', keyword: 'Developer Tools' },
    { category: 'AI Technology & Architecture', keyword: 'AI Architecture' },
  ],
  fintech: [
    { category: 'Business & Entrepreneurship', keyword: 'FinTech' },
    { category: 'Industry Applications', keyword: 'Financial Services' },
  ],
  healthcare: [
    { category: 'Social Impact & Inclusion', keyword: 'Healthcare AI' },
  ],
  ecommerce: [
    { category: 'Industry Applications', keyword: 'E-Commerce' },
    { category: 'Industry Applications', keyword: 'Retail' },
  ],
  edtech: [
    { category: 'Skills & Workforce Development', keyword: 'EdTech' },
    { category: 'Social Impact & Inclusion', keyword: 'Education' },
  ],
  manufacturing: [
    { category: 'Industry Applications', keyword: 'Manufacturing' },
  ],
  agriculture: [
    { category: 'Social Impact & Inclusion', keyword: 'AgriTech' },
  ],
  defense: [
    { category: 'Geopolitics & Global Strategy', keyword: 'Defense' },
    { category: 'Geopolitics & Global Strategy', keyword: 'Cybersecurity' },
  ],
  media: [
    { category: 'Digital Transformation & Services', keyword: 'Media' },
    { category: 'Digital Transformation & Services', keyword: 'Entertainment' },
  ],
  government: [
    { category: 'AI Governance & Ethics', keyword: 'AI Governance' },
    { category: 'AI Governance & Ethics', keyword: 'Public Sector' },
  ],
};

// --- Deduplication Helper ---

/**
 * Deduplicate keywords by (category, keyword) pair (case-insensitive).
 */
function deduplicateKeywords(keywords: Keyword[]): Keyword[] {
  const seen = new Set<string>();
  const result: Keyword[] = [];

  for (const kw of keywords) {
    const key = `${kw.category.toLowerCase()}::${kw.keyword.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(kw);
    }
  }

  return result;
}

/**
 * Deduplicate persona strings (case-insensitive).
 */
function deduplicatePersonas(personas: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const p of personas) {
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }

  return result;
}

// --- Main Builder ---

/**
 * Build a full UserProfile from quiz answers.
 *
 * @param role - The user's self-identified role
 * @param focusAreas - Up to 3 selected focus areas (new IDs or legacy labels)
 * @param missions - Up to 2 selected missions (new IDs or legacy labels)
 * @param availableDates - Array of date strings the user plans to attend
 * @param name - Optional user name
 * @param technicalDepth - Optional explicit technical depth override (from step 5); if null/undefined, uses role-inferred depth
 * @param networkingDensity - Optional networking style preference (from step 6)
 * @param orgSize - Optional organization size (from step 7)
 * @param sectors - Optional sector selections (from step 8)
 * @param dealBreakers - Optional deal breaker selections (from step 9)
 * @returns A fully populated UserProfile ready for the scoring engine
 */
export function buildProfileFromQuiz(
  role: UserRole,
  focusAreas: string[],
  missions: string[],
  availableDates: string[],
  name?: string,
  technicalDepth?: number | null,
  networkingDensity?: 'high_power' | 'high_volume' | 'balanced' | null,
  orgSize?: string | null,
  sectors?: string[] | null,
  dealBreakers?: string[] | null,
): UserProfile {
  const roleMapping = ROLE_MAP[role];

  // Start with role-based keywords
  const allKeywords: Keyword[] = [...roleMapping.keywords];

  // Add focus area keywords
  for (const focus of focusAreas) {
    const focusKeywords = FOCUS_MAP[focus];
    if (focusKeywords) {
      allKeywords.push(...focusKeywords);
    }
  }

  // Add mission keywords
  for (const mission of missions) {
    const missionKeywords = MISSION_MAP[mission];
    if (missionKeywords) {
      allKeywords.push(...missionKeywords);
    }
  }

  // Add sector keywords
  if (sectors && sectors.length > 0) {
    for (const sector of sectors) {
      const sectorKeywords = SECTOR_MAP[sector];
      if (sectorKeywords) {
        allKeywords.push(...sectorKeywords);
      }
    }
  }

  // Build personas from role mapping
  const allPersonas: string[] = [...roleMapping.personas];

  // Determine technical depth: use explicit override if provided, otherwise role-inferred
  const effectiveDepth =
    technicalDepth != null ? technicalDepth : roleMapping.depth;

  return {
    name: name || undefined,
    role,
    focusAreas,
    missions,
    availableDates,
    technicalDepthPreference: effectiveDepth,
    keywordInterests: deduplicateKeywords(allKeywords),
    personaInterests: deduplicatePersonas(allPersonas),
    networkingDensity: networkingDensity || undefined,
    orgSize: orgSize || undefined,
    sectors: sectors || undefined,
    dealBreakers: dealBreakers || undefined,
  };
}
