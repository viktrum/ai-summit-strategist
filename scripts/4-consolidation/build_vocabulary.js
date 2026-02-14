const fs = require('fs');

console.log('🔍 Building vocabulary from enriched datasets...\n');

// Load data
const events = JSON.parse(fs.readFileSync('sessions_with_logos.json', 'utf8'));
const exhibitors = JSON.parse(fs.readFileSync('expolist_enriched.json', 'utf8'));

console.log(`Loaded ${events.length} events and ${exhibitors.length} exhibitors`);

// Collect unique values
const vocabulary = {
  keywords: new Set(),
  target_personas: new Set(),
  goal_relevance: new Set(),
  technical_depth_distribution: {},
  stats: {
    total_events: events.length,
    total_exhibitors: exhibitors.length
  }
};

// Process events
console.log('\n📊 Processing events...');
let eventKeywordsCount = 0;
let eventPersonasCount = 0;
let eventGoalsCount = 0;

events.forEach(event => {
  // Keywords
  if (Array.isArray(event.keywords)) {
    event.keywords.forEach(kw => {
      vocabulary.keywords.add(kw.toLowerCase().trim());
      eventKeywordsCount++;
    });
  }

  // Target personas
  if (Array.isArray(event.target_personas)) {
    event.target_personas.forEach(persona => {
      vocabulary.target_personas.add(persona.trim());
      eventPersonasCount++;
    });
  }

  // Goal relevance
  if (Array.isArray(event.goal_relevance)) {
    event.goal_relevance.forEach(goal => {
      vocabulary.goal_relevance.add(goal.toLowerCase().trim());
      eventGoalsCount++;
    });
  }

  // Technical depth distribution
  const depth = event.technical_depth || 0;
  vocabulary.technical_depth_distribution[depth] =
    (vocabulary.technical_depth_distribution[depth] || 0) + 1;
});

console.log(`  Keywords: ${eventKeywordsCount} total, ${vocabulary.keywords.size} unique`);
console.log(`  Personas: ${eventPersonasCount} total, ${vocabulary.target_personas.size} unique`);
console.log(`  Goals: ${eventGoalsCount} total, ${vocabulary.goal_relevance.size} unique`);

// Process exhibitors
console.log('\n📊 Processing exhibitors...');
let expoKeywordsCount = 0;
let expoPersonasCount = 0;
let expoGoalsCount = 0;

exhibitors.forEach(exhibitor => {
  // Keywords
  if (Array.isArray(exhibitor.keywords)) {
    exhibitor.keywords.forEach(kw => {
      vocabulary.keywords.add(kw.toLowerCase().trim());
      expoKeywordsCount++;
    });
  }

  // Target personas
  if (Array.isArray(exhibitor.target_personas)) {
    exhibitor.target_personas.forEach(persona => {
      vocabulary.target_personas.add(persona.trim());
      expoPersonasCount++;
    });
  }

  // Goal relevance
  if (Array.isArray(exhibitor.goal_relevance)) {
    exhibitor.goal_relevance.forEach(goal => {
      vocabulary.goal_relevance.add(goal.toLowerCase().trim());
      expoGoalsCount++;
    });
  }
});

console.log(`  Keywords: ${expoKeywordsCount} total, ${vocabulary.keywords.size} unique combined`);
console.log(`  Personas: ${expoPersonasCount} total, ${vocabulary.target_personas.size} unique combined`);
console.log(`  Goals: ${expoGoalsCount} total, ${vocabulary.goal_relevance.size} unique combined`);

// Convert Sets to sorted arrays
const output = {
  keywords: Array.from(vocabulary.keywords).sort(),
  target_personas: Array.from(vocabulary.target_personas).sort(),
  goal_relevance: Array.from(vocabulary.goal_relevance).sort(),
  technical_depth_distribution: vocabulary.technical_depth_distribution,
  stats: {
    ...vocabulary.stats,
    total_unique_keywords: vocabulary.keywords.size,
    total_unique_personas: vocabulary.target_personas.size,
    total_unique_goals: vocabulary.goal_relevance.size
  }
};

// Save vocabulary
fs.writeFileSync('vocabulary.json', JSON.stringify(output, null, 2));

// Print summary
console.log('\n✅ Vocabulary built successfully!\n');
console.log('=== VOCABULARY SUMMARY ===');
console.log(`Keywords: ${output.keywords.length} unique values`);
console.log(`Personas: ${output.target_personas.length} unique values`);
console.log(`Goals: ${output.goal_relevance.length} unique values`);

console.log('\n=== TECHNICAL DEPTH DISTRIBUTION ===');
Object.entries(output.technical_depth_distribution)
  .sort((a, b) => a[0] - b[0])
  .forEach(([depth, count]) => {
    const pct = ((count / events.length) * 100).toFixed(1);
    console.log(`Depth ${depth}: ${count} events (${pct}%)`);
  });

console.log('\n=== TOP 20 KEYWORDS (Most Common) ===');
// Count keyword frequency across both datasets
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

const topKeywords = Object.entries(keywordFreq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

topKeywords.forEach(([kw, count], idx) => {
  console.log(`${idx + 1}. "${kw}" - ${count} occurrences`);
});

console.log('\n=== TOP 10 PERSONAS ===');
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

const topPersonas = Object.entries(personaFreq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

topPersonas.forEach(([persona, count], idx) => {
  console.log(`${idx + 1}. "${persona}" - ${count} occurrences`);
});

console.log('\n=== GOAL RELEVANCE DISTRIBUTION ===');
const goalFreq = {};
events.forEach(e => {
  if (Array.isArray(e.goal_relevance)) {
    e.goal_relevance.forEach(g => {
      const normalized = g.toLowerCase().trim();
      goalFreq[normalized] = (goalFreq[normalized] || 0) + 1;
    });
  }
});
exhibitors.forEach(e => {
  if (Array.isArray(e.goal_relevance)) {
    e.goal_relevance.forEach(g => {
      const normalized = g.toLowerCase().trim();
      goalFreq[normalized] = (goalFreq[normalized] || 0) + 1;
    });
  }
});

Object.entries(goalFreq)
  .sort((a, b) => b[1] - a[1])
  .forEach(([goal, count]) => {
    const totalItems = events.length + exhibitors.length;
    const pct = ((count / totalItems) * 100).toFixed(1);
    console.log(`"${goal}": ${count} items (${pct}%)`);
  });

console.log('\n📝 Written to vocabulary.json');
console.log('\n💡 Next step: Use this vocabulary to populate quizMapper.ts');
