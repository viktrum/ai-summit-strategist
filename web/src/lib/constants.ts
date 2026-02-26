/** Shared constants across pages. */

/** Technical depth border colors (index 0-4 maps to depth 1-5). */
export const DEPTH_COLORS = ['#A8A29E', '#D97706', '#4338CA', '#6D28D9', '#BE123C'];

/** Role label map for display. */
export const ROLE_LABEL_MAP: Record<string, string> = {
  'founder-cxo': 'Founder / CXO',
  'investor-vc': 'Investor / VC',
  'product-leader': 'Product Leader',
  'engineer-researcher': 'Engineer / Researcher',
  'policy-government': 'Policy / Government',
  'student-academic': 'Student / Academic',
};

/** Networking density label map. */
export const DENSITY_LABEL_MAP: Record<string, string> = {
  high_power: 'high-power networking rooms',
  high_volume: 'high-volume conference halls',
  balanced: 'balanced mix of sessions',
};

/** Interest ID → display label map. */
export const INTEREST_LABEL_MAP: Record<string, string> = {
  llms_foundation: 'LLMs & Foundation Models',
  agentic_ai: 'Agentic AI & Autonomous Systems',
  compute_infra: 'Compute, Cloud & Infrastructure',
  safety_governance: 'AI Safety & Governance',
  startups_vc: 'Startups & Venture Capital',
  enterprise_ai: 'Enterprise AI Adoption',
  health_agri_impact: 'Health, Agri & Social Impact',
  geopolitics: 'Geopolitics & Global AI Policy',
};

/** Mission ID → display label map. */
export const MISSION_LABEL_MAP: Record<string, string> = {
  hiring: 'Finding Talent',
  fundraising: 'Fundraising',
  sales: 'Finding Customers',
  upskilling: 'Deep Learning',
  networking: 'Networking',
};

/** Explore page topic categories with emoji and keywords. */
export const TOPIC_CATEGORIES: Record<string, { emoji: string; keywords: string[] }> = {
  'AI Governance & Policy': { emoji: '🏛️', keywords: ['governance', 'policy', 'regulation'] },
  'LLMs & Foundation Models': { emoji: '🧠', keywords: ['llm', 'foundation model', 'generative'] },
  'Responsible & Ethical AI': { emoji: '⚖️', keywords: ['responsible', 'ethical', 'bias', 'fairness'] },
  'AI Safety': { emoji: '🛡️', keywords: ['safety', 'alignment', 'risk'] },
  'Healthcare & Biotech': { emoji: '🏥', keywords: ['health', 'medical', 'biotech', 'genomic'] },
  'Agriculture & Climate': { emoji: '🌾', keywords: ['agriculture', 'agri', 'climate', 'sustainability'] },
  'Education & Skilling': { emoji: '📚', keywords: ['education', 'skilling', 'learning', 'academic'] },
  'Startups & Venture Capital': { emoji: '🚀', keywords: ['startup', 'venture', 'funding', 'entrepreneur'] },
  'Enterprise & Industry': { emoji: '🏢', keywords: ['enterprise', 'industry', 'adoption', 'digital transformation'] },
  'Compute & Infrastructure': { emoji: '⚡', keywords: ['compute', 'infrastructure', 'cloud', 'hardware'] },
  'Global South & Inclusion': { emoji: '🌍', keywords: ['global south', 'inclusion', 'developing', 'digital public'] },
  'Defense & Security': { emoji: '🔒', keywords: ['defense', 'security', 'cyber', 'military'] },
};
