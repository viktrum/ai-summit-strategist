const fs = require('fs');

console.log('🔨 Building consolidation maps...\n');

// Load data
const vocabulary = JSON.parse(fs.readFileSync('vocabulary.json', 'utf8'));
const events = JSON.parse(fs.readFileSync('sessions_with_logos.json', 'utf8'));
const exhibitors = JSON.parse(fs.readFileSync('expolist_enriched.json', 'utf8'));

console.log(`Loaded vocabulary with ${vocabulary.keywords.length} keywords and ${vocabulary.target_personas.length} personas`);

// ============================================
// KEYWORD CONSOLIDATION
// ============================================

console.log('\n📊 Analyzing keywords...');

// Count keyword frequencies
const keywordFreq = {};
events.forEach(e => {
  if (Array.isArray(e.keywords)) {
    e.keywords.forEach(kw => {
      const normalized = kw.toLowerCase().trim();
      keywordFreq[normalized] = (keywordFreq[normalized] || 0) + 1;
    });
  }
});
exhibitors.forEach(e => {
  if (Array.isArray(e.keywords)) {
    e.keywords.forEach(kw => {
      const normalized = kw.toLowerCase().trim();
      keywordFreq[normalized] = (keywordFreq[normalized] || 0) + 1;
    });
  }
});

// Define core keyword categories (target ~25 consolidated keywords)
const keywordGroups = {
  "Generative AI": [
    "generative ai", "llms", "large language models", "foundation models",
    "gpt", "chatgpt", "text generation", "content generation"
  ],
  "Enterprise AI": [
    "enterprise ai", "enterprise adoption", "ai transformation",
    "business ai", "corporate ai"
  ],
  "AI Infrastructure": [
    "ai infrastructure", "compute infrastructure", "ai compute",
    "gpu infrastructure", "ml infrastructure", "mlops"
  ],
  "Cloud & Computing": [
    "cloud computing", "edge computing", "distributed computing",
    "serverless", "cloud infrastructure"
  ],
  "AI Governance": [
    "ai governance", "ai regulation", "ai policy", "responsible ai",
    "ethical ai", "ai ethics", "ai safety", "trustworthy ai"
  ],
  "Data Management": [
    "data governance", "data management", "data privacy", "data security",
    "data infrastructure", "data engineering"
  ],
  "Digital Public Infrastructure": [
    "digital public infrastructure", "dpi", "digital india",
    "digital transformation", "e-governance"
  ],
  "Startups & Venture Capital": [
    "startup ecosystem", "venture capital", "funding", "investment",
    "angel investment", "fundraising", "startup funding"
  ],
  "Healthcare AI": [
    "healthcare ai", "medtech", "health tech", "medical ai",
    "clinical ai", "diagnostics"
  ],
  "Education & Skilling": [
    "edtech", "ai skilling", "education technology", "learning",
    "training", "upskilling", "reskilling"
  ],
  "Financial Technology": [
    "fintech", "banking ai", "financial services", "payments",
    "insurtech", "wealth management"
  ],
  "Agriculture": [
    "agtech", "agriculture ai", "precision agriculture", "farming",
    "agri-tech"
  ],
  "Cybersecurity": [
    "cybersecurity", "security", "threat detection", "ai security",
    "information security"
  ],
  "Research & Development": [
    "research", "r&d", "innovation", "academic research", "ai research"
  ],
  "Computer Vision": [
    "computer vision", "image recognition", "video analysis",
    "visual ai", "object detection"
  ],
  "Natural Language Processing": [
    "nlp", "natural language processing", "text analysis",
    "language models", "speech recognition"
  ],
  "Semiconductors": [
    "semiconductor", "chip design", "hardware", "ai chips",
    "silicon"
  ],
  "Sovereign AI": [
    "sovereign ai", "national ai", "indigenization",
    "self-reliance", "atmanirbhar"
  ],
  "Global South": [
    "global south", "developing nations", "emerging markets",
    "inclusive ai"
  ],
  "Social Impact": [
    "social impact", "social good", "sustainability", "climate tech",
    "impact investing"
  ],
  "Automation": [
    "automation", "robotic process automation", "intelligent automation",
    "workflow automation"
  ],
  "Analytics": [
    "analytics", "data analytics", "business intelligence",
    "predictive analytics", "ai analytics"
  ],
  "Open Source": [
    "open source", "open ai", "community models", "open models"
  ],
  "Quantum Computing": [
    "quantum computing", "quantum ai", "quantum"
  ],
  "Other": [] // Catch-all for unmapped keywords
};

// Build reverse mapping: original keyword -> consolidated keyword
const keywordMap = {};
const keywordStats = {};

// Initialize stats
Object.keys(keywordGroups).forEach(group => {
  keywordStats[group] = { count: 0, original_keywords: [] };
});

// Map each keyword to a group
Object.entries(keywordFreq).forEach(([keyword, freq]) => {
  let mapped = false;

  // Try to find matching group
  for (const [groupName, patterns] of Object.entries(keywordGroups)) {
    if (groupName === "Other") continue;

    // Check if keyword matches any pattern in this group
    for (const pattern of patterns) {
      if (keyword === pattern || keyword.includes(pattern) || pattern.includes(keyword)) {
        keywordMap[keyword] = groupName;
        keywordStats[groupName].count += freq;
        keywordStats[groupName].original_keywords.push(`${keyword} (${freq})`);
        mapped = true;
        break;
      }
    }

    if (mapped) break;
  }

  // If no match, put in "Other"
  if (!mapped) {
    keywordMap[keyword] = "Other";
    keywordStats["Other"].count += freq;
    keywordStats["Other"].original_keywords.push(`${keyword} (${freq})`);
  }
});

console.log(`Mapped ${Object.keys(keywordMap).length} keywords to ${Object.keys(keywordGroups).length} categories`);

// ============================================
// PERSONA CONSOLIDATION
// ============================================

console.log('\n📊 Analyzing personas...');

// Count persona frequencies
const personaFreq = {};
events.forEach(e => {
  if (Array.isArray(e.target_personas)) {
    e.target_personas.forEach(p => {
      const normalized = p.trim();
      personaFreq[normalized] = (personaFreq[normalized] || 0) + 1;
    });
  }
});
exhibitors.forEach(e => {
  if (Array.isArray(e.target_personas)) {
    e.target_personas.forEach(p => {
      const normalized = p.trim();
      personaFreq[normalized] = (personaFreq[normalized] || 0) + 1;
    });
  }
});

// Define core persona categories (target ~25 consolidated personas)
const personaGroups = {
  "Startup Founders": [
    "Startup Founders", "Founders", "Entrepreneur", "Startup CEOs",
    "Early-stage Founders", "Tech Founders"
  ],
  "C-Suite Executives": [
    "C-Suite Executives", "CEOs", "CXOs", "Chief Executive Officers",
    "Managing Directors", "Senior Leadership"
  ],
  "Enterprise IT Leaders": [
    "Enterprise IT Leaders", "CIOs", "CTOs", "IT Directors",
    "Technology Leaders", "IT Heads"
  ],
  "Product Managers": [
    "Product Managers", "Product Leaders", "Product Owners",
    "PMs", "Product Directors"
  ],
  "Engineers": [
    "ML Engineers", "Software Engineers", "Data Engineers",
    "AI Engineers", "DevOps Engineers", "Backend Engineers",
    "Frontend Engineers", "Full Stack Engineers"
  ],
  "Data Scientists": [
    "Data Scientists", "AI Researchers", "ML Researchers",
    "Data Analysts"
  ],
  "Researchers": [
    "Researchers", "Academic Researchers", "Research Scientists",
    "Scientists", "PhDs"
  ],
  "Investors": [
    "Investors", "VCs", "Venture Capitalists", "Angel Investors",
    "Investment Managers", "Fund Managers"
  ],
  "Government Officials": [
    "Government Officials", "Gov Officials", "Public Sector Leaders",
    "Government Agencies", "Civil Servants"
  ],
  "Policy Makers": [
    "Policy Makers", "Regulators", "Policymakers", "Legal Experts",
    "Compliance Officers"
  ],
  "Consultants": [
    "Consultants", "Strategy Consultants", "Business Consultants",
    "Management Consultants", "Advisory"
  ],
  "Sales & Business Development": [
    "Sales Leaders", "Business Development", "Sales Professionals",
    "Account Managers", "Partnership Managers"
  ],
  "Marketing Leaders": [
    "Marketing Leaders", "CMOs", "Marketing Managers",
    "Growth Marketers", "Digital Marketers"
  ],
  "Healthcare Professionals": [
    "Healthcare Professionals", "Medical Professionals", "Doctors",
    "Hospital Administrators", "Health Tech Leaders"
  ],
  "Educators": [
    "Educators", "Teachers", "Professors", "Academic Administrators",
    "University Faculty"
  ],
  "Students": [
    "Students", "College Students", "University Students",
    "Graduates", "Undergraduates"
  ],
  "Media & Analysts": [
    "Journalists", "Media", "Industry Analysts", "Research Analysts",
    "Tech Journalists"
  ],
  "Operations Leaders": [
    "COOs", "Operations Managers", "Operations Leaders",
    "VP Operations"
  ],
  "Finance Leaders": [
    "CFOs", "Finance Leaders", "Financial Analysts",
    "Finance Managers"
  ],
  "HR Leaders": [
    "HR Leaders", "Chief HR Officers", "Talent Managers",
    "Recruitment Heads"
  ],
  "Legal & Compliance": [
    "Legal Leaders", "General Counsel", "Compliance Heads",
    "Legal Advisors"
  ],
  "Innovation Leaders": [
    "Innovation Leaders", "Innovation Managers", "R&D Heads",
    "Chief Innovation Officers"
  ],
  "Procurement Officers": [
    "Procurement Officers", "Purchasing Managers", "Buyers",
    "Sourcing Managers"
  ],
  "NGO Leaders": [
    "NGO Leaders", "Non-profit Leaders", "Social Sector",
    "Development Organizations"
  ],
  "Other": [] // Catch-all
};

// Build reverse mapping: original persona -> consolidated persona
const personaMap = {};
const personaStats = {};

// Initialize stats
Object.keys(personaGroups).forEach(group => {
  personaStats[group] = { count: 0, original_personas: [] };
});

// Map each persona to a group
Object.entries(personaFreq).forEach(([persona, freq]) => {
  let mapped = false;

  // Try to find matching group
  for (const [groupName, patterns] of Object.entries(personaGroups)) {
    if (groupName === "Other") continue;

    // Check if persona matches any pattern in this group
    for (const pattern of patterns) {
      if (persona === pattern || persona.includes(pattern) || pattern.includes(persona)) {
        personaMap[persona] = groupName;
        personaStats[groupName].count += freq;
        personaStats[groupName].original_personas.push(`${persona} (${freq})`);
        mapped = true;
        break;
      }
    }

    if (mapped) break;
  }

  // If no match, put in "Other"
  if (!mapped) {
    personaMap[persona] = "Other";
    personaStats["Other"].count += freq;
    personaStats["Other"].original_personas.push(`${persona} (${freq})`);
  }
});

console.log(`Mapped ${Object.keys(personaMap).length} personas to ${Object.keys(personaGroups).length} categories`);

// ============================================
// SAVE CONSOLIDATION MAPS
// ============================================

// Save keyword consolidation map
const keywordOutput = {
  summary: {
    original_count: Object.keys(keywordMap).length,
    consolidated_count: Object.keys(keywordGroups).length,
    reduction_pct: ((1 - Object.keys(keywordGroups).length / Object.keys(keywordMap).length) * 100).toFixed(1)
  },
  mapping: keywordMap,
  stats: keywordStats
};

fs.writeFileSync('keyword_consolidation_map.json', JSON.stringify(keywordOutput, null, 2));

// Save persona consolidation map
const personaOutput = {
  summary: {
    original_count: Object.keys(personaMap).length,
    consolidated_count: Object.keys(personaGroups).length,
    reduction_pct: ((1 - Object.keys(personaGroups).length / Object.keys(personaMap).length) * 100).toFixed(1)
  },
  mapping: personaMap,
  stats: personaStats
};

fs.writeFileSync('persona_consolidation_map.json', JSON.stringify(personaOutput, null, 2));

// ============================================
// PRINT SUMMARY
// ============================================

console.log('\n✅ Consolidation maps created!\n');

console.log('=== KEYWORD CONSOLIDATION ===');
console.log(`Original: ${keywordOutput.summary.original_count} unique keywords`);
console.log(`Consolidated: ${keywordOutput.summary.consolidated_count} categories`);
console.log(`Reduction: ${keywordOutput.summary.reduction_pct}%\n`);

console.log('Top 10 keyword categories by frequency:');
Object.entries(keywordStats)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 10)
  .forEach(([category, data], idx) => {
    const uniqueCount = data.original_keywords.length;
    console.log(`${idx + 1}. ${category}: ${data.count} occurrences (${uniqueCount} original keywords)`);
  });

console.log('\n=== PERSONA CONSOLIDATION ===');
console.log(`Original: ${personaOutput.summary.original_count} unique personas`);
console.log(`Consolidated: ${personaOutput.summary.consolidated_count} categories`);
console.log(`Reduction: ${personaOutput.summary.reduction_pct}%\n`);

console.log('Top 10 persona categories by frequency:');
Object.entries(personaStats)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 10)
  .forEach(([category, data], idx) => {
    const uniqueCount = data.original_personas.length;
    console.log(`${idx + 1}. ${category}: ${data.count} occurrences (${uniqueCount} original personas)`);
  });

console.log('\n📝 Files created:');
console.log('  - keyword_consolidation_map.json');
console.log('  - persona_consolidation_map.json');

console.log('\n💡 Review these maps and approve before applying to events.');
console.log('   Use apply_consolidation.js to update events after approval.');
