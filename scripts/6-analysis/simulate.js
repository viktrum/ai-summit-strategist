const fs = require('fs');
const path = require('path');

console.log('🧪 AI Summit Strategist - Scoring Simulation\n');
console.log('This validates the tag-based scoring algorithm against 6 sample personas.\n');

// Load production data
const eventsPath = path.join(__dirname, '../../data/production/events.json');
const exhibitorsPath = path.join(__dirname, '../../data/production/exhibitors.json');

const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
const exhibitors = JSON.parse(fs.readFileSync(exhibitorsPath, 'utf8'));

console.log(`📊 Loaded ${events.length} events and ${exhibitors.length} exhibitors\n`);

// Sample user profiles (6 different personas)
const profiles = [
  {
    name: 'Technical Founder (Series A)',
    technical_depth_preference: 4, // High technical depth
    keyword_interests: [
      { category: 'AI Technology & Architecture', keyword: 'Generative AI' },
      { category: 'AI Technology & Architecture', keyword: 'Large Language Models' },
      { category: 'Business & Entrepreneurship', keyword: 'Startups' },
      { category: 'Business & Entrepreneurship', keyword: 'Venture Capital' },
      { category: 'Data & Infrastructure', keyword: 'Cloud Computing' }
    ],
    persona_interests: [
      'Technical Founders',
      'Growth-Stage Founders',
      'Technology Leaders',
      'AI/ML Engineers'
    ],
    goals: ['fundraising', 'hiring', 'learning'],
    available_dates: ['2026-02-17', '2026-02-18', '2026-02-19'] // 3 days
  },
  {
    name: 'AI Researcher (Academia)',
    technical_depth_preference: 5, // Deepest technical content
    keyword_interests: [
      { category: 'Research & Innovation', keyword: 'AI Research' },
      { category: 'AI Technology & Architecture', keyword: 'Foundation Models' },
      { category: 'AI Governance & Ethics', keyword: 'AI Safety' },
      { category: 'Specialized AI Domains', keyword: 'Natural Language Processing' },
      { category: 'Specialized AI Domains', keyword: 'Computer Vision' }
    ],
    persona_interests: [
      'AI Researchers',
      'Academic Researchers',
      'Data Scientists',
      'AI/ML Engineers'
    ],
    goals: ['learning', 'networking'],
    available_dates: ['2026-02-19', '2026-02-20'] // 2 days (VIP days)
  },
  {
    name: 'Government Policy Maker',
    technical_depth_preference: 2, // Policy-focused, not technical
    keyword_interests: [
      { category: 'AI Governance & Ethics', keyword: 'AI Governance' },
      { category: 'Geopolitics & Global Strategy', keyword: 'Global South' },
      { category: 'Regulatory & Legal Frameworks', keyword: 'Regulation' },
      { category: 'Social Impact & Inclusion', keyword: 'Digital Public Infrastructure' },
      { category: 'AI Governance & Ethics', keyword: 'Responsible AI' }
    ],
    persona_interests: [
      'Government & Policy Leaders',
      'Policy & Regulatory Experts',
      'International Development Specialists'
    ],
    goals: ['networking', 'policy_insights'],
    available_dates: ['2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20'] // All 5 days
  },
  {
    name: 'Enterprise CTO (Fortune 500)',
    technical_depth_preference: 3, // Implementation-focused
    keyword_interests: [
      { category: 'Industry Applications', keyword: 'Enterprise AI' },
      { category: 'AI Governance & Ethics', keyword: 'Responsible AI' },
      { category: 'Data & Infrastructure', keyword: 'Cloud Computing' },
      { category: 'Digital Transformation & Services', keyword: 'Digital Transformation' },
      { category: 'Skills & Workforce Development', keyword: 'AI Literacy' }
    ],
    persona_interests: [
      'Technology Leaders',
      'C-Suite Executives',
      'Enterprise AI Leaders',
      'Data & Analytics Leaders'
    ],
    goals: ['vendor_discovery', 'implementation_learning'],
    available_dates: ['2026-02-17', '2026-02-18'] // 2 days (busy schedule)
  },
  {
    name: 'EdTech Founder (Impact-Focused)',
    technical_depth_preference: 3,
    keyword_interests: [
      { category: 'Social Impact & Inclusion', keyword: 'Education' },
      { category: 'Business & Entrepreneurship', keyword: 'Startups' },
      { category: 'Industry Applications', keyword: 'EdTech' },
      { category: 'AI Governance & Ethics', keyword: 'Ethical AI' },
      { category: 'Geopolitics & Global Strategy', keyword: 'Global South' }
    ],
    persona_interests: [
      'EdTech Founders',
      'Early-Stage Founders',
      'Social Impact Leaders',
      'Government & Policy Leaders' // Want to meet gov officials for procurement
    ],
    goals: ['fundraising', 'customer_discovery', 'policy_insights'],
    available_dates: ['2026-02-18', '2026-02-19', '2026-02-20'] // 3 days
  },
  {
    name: 'Student (AI Enthusiast)',
    technical_depth_preference: 3,
    keyword_interests: [
      { category: 'AI Technology & Architecture', keyword: 'Generative AI' },
      { category: 'Skills & Workforce Development', keyword: 'AI Literacy' },
      { category: 'Industry Applications', keyword: 'AI Applications' },
      { category: 'Research & Innovation', keyword: 'Innovation' },
      { category: 'AI Governance & Ethics', keyword: 'Ethical AI' }
    ],
    persona_interests: [
      'Students & Early Career',
      'AI Researchers',
      'Early-Stage Founders',
      'AI/ML Engineers'
    ],
    goals: ['learning', 'networking', 'career'],
    available_dates: ['2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20'] // All days
  }
];

// ===== SCORING ALGORITHM =====

function scoreEvent(event, profile) {
  let score = 0;
  const breakdown = {
    keyword_match: 0,
    persona_match: 0,
    technical_depth: 0,
    heavy_hitter: 0,
    date_available: 0
  };

  // 1. Date availability (hard filter - return 0 if not available)
  if (!profile.available_dates.includes(event.date)) {
    return { score: 0, breakdown };
  }
  breakdown.date_available = 10; // Base score for being on an available date

  // 2. Keyword matching (40 points max)
  // - Exact keyword match: 8 points
  // - Same category match: 4 points
  const userKeywords = new Set(profile.keyword_interests.map(k => k.keyword));
  const userCategories = new Set(profile.keyword_interests.map(k => k.category));

  event.keywords.forEach(eventKeyword => {
    if (userKeywords.has(eventKeyword.keyword)) {
      breakdown.keyword_match += 8;
    } else if (userCategories.has(eventKeyword.category)) {
      breakdown.keyword_match += 4;
    }
  });

  // Cap keyword score at 40
  breakdown.keyword_match = Math.min(breakdown.keyword_match, 40);

  // 3. Persona matching (30 points max)
  // - Exact persona match: 10 points each (max 30)
  const userPersonas = new Set(profile.persona_interests);
  event.target_personas.forEach(eventPersona => {
    if (userPersonas.has(eventPersona)) {
      breakdown.persona_match += 10;
    }
  });
  breakdown.persona_match = Math.min(breakdown.persona_match, 30);

  // 4. Technical depth alignment (20 points max)
  // - Exact match: 20 points
  // - Off by 1: 10 points
  // - Off by 2: 5 points
  // - Off by 3+: 0 points
  const depthDiff = Math.abs(event.technical_depth - profile.technical_depth_preference);
  if (depthDiff === 0) {
    breakdown.technical_depth = 20;
  } else if (depthDiff === 1) {
    breakdown.technical_depth = 10;
  } else if (depthDiff === 2) {
    breakdown.technical_depth = 5;
  }

  // 5. Heavy hitter bonus (10 points)
  if (event.networking_signals?.is_heavy_hitter) {
    breakdown.heavy_hitter = 10;
  }

  // Calculate total
  score = breakdown.date_available +
          breakdown.keyword_match +
          breakdown.persona_match +
          breakdown.technical_depth +
          breakdown.heavy_hitter;

  return { score, breakdown };
}

function scoreExhibitor(exhibitor, profile) {
  let score = 0;
  const breakdown = {
    keyword_match: 0,
    persona_match: 0
  };

  // Keyword matching (60 points max)
  const userKeywords = new Set(profile.keyword_interests.map(k => k.keyword));
  const userCategories = new Set(profile.keyword_interests.map(k => k.category));

  exhibitor.keywords.forEach(exhibKeyword => {
    if (userKeywords.has(exhibKeyword.keyword)) {
      breakdown.keyword_match += 10;
    } else if (userCategories.has(exhibKeyword.category)) {
      breakdown.keyword_match += 5;
    }
  });
  breakdown.keyword_match = Math.min(breakdown.keyword_match, 60);

  // Persona matching (40 points max)
  const userPersonas = new Set(profile.persona_interests);
  exhibitor.target_personas.forEach(exhibPersona => {
    if (userPersonas.has(exhibPersona)) {
      breakdown.persona_match += 10;
    }
  });
  breakdown.persona_match = Math.min(breakdown.persona_match, 40);

  score = breakdown.keyword_match + breakdown.persona_match;
  return { score, breakdown };
}

// ===== CONFLICT DETECTION =====

function getTimeSlotKey(event) {
  return `${event.date}_${event.start_time}`;
}

function resolveConflicts(scoredEvents) {
  const timeSlots = {};
  const resolved = [];

  // Group by time slot
  scoredEvents.forEach(item => {
    const key = getTimeSlotKey(item.event);
    if (!timeSlots[key]) {
      timeSlots[key] = [];
    }
    timeSlots[key].push(item);
  });

  // For each time slot, take the highest-scoring event
  Object.values(timeSlots).forEach(slotEvents => {
    // Sort by score (descending)
    slotEvents.sort((a, b) => b.score - a.score);

    const primary = slotEvents[0];
    const fallback = slotEvents.length > 1 ? slotEvents[1] : null;

    resolved.push({
      ...primary,
      has_conflict: slotEvents.length > 1,
      fallback: fallback ? {
        event_id: fallback.event.event_id,
        title: fallback.event.title,
        score: fallback.score
      } : null
    });
  });

  return resolved;
}

// ===== RUN SIMULATIONS =====

console.log('='.repeat(80));
console.log('RUNNING SIMULATIONS FOR 6 PERSONAS');
console.log('='.repeat(80));

profiles.forEach((profile, idx) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`PROFILE ${idx + 1}: ${profile.name.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log(`Technical Depth: ${profile.technical_depth_preference}/5`);
  console.log(`Available Dates: ${profile.available_dates.join(', ')}`);
  console.log(`Keywords: ${profile.keyword_interests.map(k => k.keyword).join(', ')}`);
  console.log(`Personas: ${profile.persona_interests.join(', ')}`);
  console.log('');

  // Score all events
  const scoredEvents = events.map(event => {
    const { score, breakdown } = scoreEvent(event, profile);
    return { event, score, breakdown };
  });

  // Filter out zero scores and sort by score
  const validEvents = scoredEvents.filter(item => item.score > 0);
  validEvents.sort((a, b) => b.score - a.score);

  console.log(`📊 Matched Events: ${validEvents.length} / ${events.length} (${((validEvents.length / events.length) * 100).toFixed(1)}%)`);

  // Take top 20 for conflict resolution (then we'll pick top 10-12)
  const top20 = validEvents.slice(0, 20);

  // Resolve conflicts
  const resolved = resolveConflicts(top20);
  resolved.sort((a, b) => b.score - a.score);

  // Recommend top 10-12 (aim for ~4 per day, adjust based on available days)
  const eventsPerDay = profile.available_dates.length <= 2 ? 5 : 4;
  const targetCount = Math.min(12, eventsPerDay * profile.available_dates.length);
  const recommendations = resolved.slice(0, targetCount);

  console.log(`\n🎯 TOP ${recommendations.length} RECOMMENDATIONS:\n`);

  // Group by date
  const byDate = {};
  recommendations.forEach(item => {
    const date = item.event.date;
    if (!byDate[date]) {
      byDate[date] = [];
    }
    byDate[date].push(item);
  });

  // Display grouped by date
  profile.available_dates.forEach(date => {
    const dateEvents = byDate[date] || [];
    console.log(`\n📅 ${date} (${dateEvents.length} events)`);
    console.log('-'.repeat(80));

    if (dateEvents.length === 0) {
      console.log('  (No high-scoring events on this day)');
    } else {
      dateEvents.forEach((item, i) => {
        const event = item.event;
        console.log(`\n  ${i + 1}. ${event.title}`);
        console.log(`     Score: ${item.score}/100 | ${event.start_time}-${event.end_time} | ${event.venue}`);
        console.log(`     Depth: ${event.technical_depth}/5 ${event.networking_signals?.is_heavy_hitter ? '| 🔥 HEAVY HITTER' : ''}`);
        console.log(`     Breakdown: Keyword=${item.breakdown.keyword_match}, Persona=${item.breakdown.persona_match}, Depth=${item.breakdown.technical_depth}, HH=${item.breakdown.heavy_hitter}`);

        if (item.has_conflict) {
          console.log(`     ⚠️  TIME CONFLICT - Fallback: "${item.fallback.title}" (score ${item.fallback.score})`);
        }
      });
    }
  });

  // Score top exhibitors
  console.log(`\n\n🏢 TOP 5 EXHIBITORS TO VISIT:\n`);
  const scoredExhibitors = exhibitors.map(exhibitor => {
    const { score, breakdown } = scoreExhibitor(exhibitor, profile);
    return { exhibitor, score, breakdown };
  });

  scoredExhibitors.sort((a, b) => b.score - a.score);
  const topExhibitors = scoredExhibitors.slice(0, 5);

  topExhibitors.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.exhibitor.name}`);
    console.log(`     Score: ${item.score}/100`);
    console.log(`     Category: ${item.exhibitor.category}`);
    console.log(`     Breakdown: Keyword=${item.breakdown.keyword_match}, Persona=${item.breakdown.persona_match}`);
    if (item.exhibitor.logo_url) {
      console.log(`     Logo: ${item.exhibitor.logo_url}`);
    }
    console.log('');
  });

  // Summary stats
  console.log(`\n📈 VALIDATION METRICS:\n`);

  const avgScore = recommendations.reduce((sum, item) => sum + item.score, 0) / recommendations.length;
  const scores = recommendations.map(item => item.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  const heavyHitterCount = recommendations.filter(item => item.event.networking_signals?.is_heavy_hitter).length;
  const conflictCount = recommendations.filter(item => item.has_conflict).length;

  const depthDistribution = {};
  recommendations.forEach(item => {
    const depth = item.event.technical_depth;
    depthDistribution[depth] = (depthDistribution[depth] || 0) + 1;
  });

  console.log(`  Average Score: ${avgScore.toFixed(1)}/100`);
  console.log(`  Score Range: ${minScore} - ${maxScore}`);
  console.log(`  Heavy Hitters: ${heavyHitterCount}/${recommendations.length} (${((heavyHitterCount / recommendations.length) * 100).toFixed(0)}%)`);
  console.log(`  Time Conflicts: ${conflictCount}/${recommendations.length}`);
  console.log(`  Events Per Day: ${Object.entries(byDate).map(([date, events]) => `${date.split('-')[2]}=${events.length}`).join(', ')}`);
  console.log(`  Depth Distribution: ${Object.entries(depthDistribution).map(([depth, count]) => `L${depth}=${count}`).sort().join(', ')}`);

  // Validation checks
  console.log(`\n✅ VALIDATION CHECKS:\n`);

  const checks = [];

  // 1. Score distribution reasonable (avg should be 40-70 for good matches)
  if (avgScore >= 40 && avgScore <= 70) {
    checks.push('✅ Average score in healthy range (40-70)');
  } else if (avgScore < 40) {
    checks.push('⚠️  Average score low (<40) - may need to relax matching criteria');
  } else {
    checks.push('⚠️  Average score very high (>70) - matching may be too generous');
  }

  // 2. Not too many conflicts (should be <30%)
  const conflictRate = (conflictCount / recommendations.length) * 100;
  if (conflictRate < 30) {
    checks.push(`✅ Conflict rate acceptable (${conflictRate.toFixed(0)}% < 30%)`);
  } else {
    checks.push(`⚠️  High conflict rate (${conflictRate.toFixed(0)}%) - may need more events or different dates`);
  }

  // 3. Events distributed across days (shouldn't be >5 per day)
  const maxEventsPerDay = Math.max(...Object.values(byDate).map(events => events.length));
  if (maxEventsPerDay <= 5) {
    checks.push(`✅ No day overloaded (max ${maxEventsPerDay} events/day)`);
  } else {
    checks.push(`⚠️  Day overload detected (${maxEventsPerDay} events on one day)`);
  }

  // 4. Technical depth mostly aligned (80%+ should be within ±1 of preference)
  const alignedCount = recommendations.filter(item =>
    Math.abs(item.event.technical_depth - profile.technical_depth_preference) <= 1
  ).length;
  const alignedPct = (alignedCount / recommendations.length) * 100;
  if (alignedPct >= 80) {
    checks.push(`✅ Technical depth well-aligned (${alignedPct.toFixed(0)}% within ±1)`);
  } else {
    checks.push(`⚠️  Technical depth misalignment (only ${alignedPct.toFixed(0)}% within ±1)`);
  }

  checks.forEach(check => console.log(`  ${check}`));
});

console.log(`\n${'='.repeat(80)}`);
console.log('SIMULATION COMPLETE');
console.log('='.repeat(80));
console.log('\n✅ All 6 personas simulated successfully');
console.log('📊 Review the recommendations above to validate scoring logic');
console.log('🎯 Next: Adjust weights if needed, then build the UI\n');
