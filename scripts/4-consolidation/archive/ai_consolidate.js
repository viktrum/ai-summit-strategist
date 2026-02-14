const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🤖 AI-powered tag consolidation using Claude Haiku...\n');

// Load data
const vocabulary = JSON.parse(fs.readFileSync('vocabulary.json', 'utf8'));
const events = JSON.parse(fs.readFileSync('sessions_with_logos.json', 'utf8'));
const exhibitors = JSON.parse(fs.readFileSync('expolist_enriched.json', 'utf8'));

// Count frequencies
function countFrequencies(items, fieldName) {
  const freq = {};
  items.forEach(item => {
    if (Array.isArray(item[fieldName])) {
      item[fieldName].forEach(value => {
        const normalized = fieldName === 'keywords'
          ? value.toLowerCase().trim()
          : value.trim();
        freq[normalized] = (freq[normalized] || 0) + 1;
      });
    }
  });
  return freq;
}

const keywordFreq = {
  ...countFrequencies(events, 'keywords'),
};
Object.entries(countFrequencies(exhibitors, 'keywords')).forEach(([k, v]) => {
  keywordFreq[k] = (keywordFreq[k] || 0) + v;
});

const personaFreq = {
  ...countFrequencies(events, 'target_personas'),
};
Object.entries(countFrequencies(exhibitors, 'target_personas')).forEach(([k, v]) => {
  personaFreq[k] = (personaFreq[k] || 0) + v;
});

console.log(`Found ${Object.keys(keywordFreq).length} unique keywords`);
console.log(`Found ${Object.keys(personaFreq).length} unique personas\n`);

// Define target categories
const keywordCategories = [
  "Generative AI",
  "Enterprise AI",
  "AI Infrastructure",
  "Cloud & Computing",
  "AI Governance",
  "Data Management",
  "Digital Public Infrastructure",
  "Startups & Venture Capital",
  "Healthcare AI",
  "Education & Skilling",
  "Financial Technology",
  "Agriculture",
  "Cybersecurity",
  "Research & Development",
  "Computer Vision",
  "Natural Language Processing",
  "Semiconductors",
  "Sovereign AI",
  "Global South",
  "Social Impact",
  "Automation",
  "Analytics",
  "Open Source",
  "Quantum Computing",
  "Future of Work"
];

const personaCategories = [
  "Startup Founders",
  "C-Suite Executives",
  "Enterprise IT Leaders",
  "Product Managers",
  "Engineers",
  "Data Scientists",
  "Researchers",
  "Investors",
  "Government Officials",
  "Policy Makers",
  "Consultants",
  "Sales & Business Development",
  "Marketing Leaders",
  "Healthcare Professionals",
  "Educators",
  "Students",
  "Media & Analysts",
  "Operations Leaders",
  "Finance Leaders",
  "HR Leaders",
  "Legal & Compliance",
  "Innovation Leaders",
  "Procurement Officers",
  "NGO Leaders",
  "Urban & Infrastructure Leaders"
];

// AI consolidation function
async function consolidateWithAI(items, categories, type) {
  console.log(`\n🤖 Processing ${items.length} ${type}s in batches...\n`);

  const mapping = {};
  const batchSize = 200; // Process 200 items at a time
  const batches = [];

  // Create batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  console.log(`Split into ${batches.length} batches of ~${batchSize} items each`);

  // Process each batch
  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    console.log(`\nProcessing batch ${batchIdx + 1}/${batches.length} (${batch.length} items)...`);

    const prompt = `You are consolidating ${type}s for an AI summit event matching system.

TARGET CATEGORIES (${categories.length} total):
${categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

ORIGINAL ${type.toUpperCase()}S TO MAP (${batch.length} items):
${batch.join('\n')}

TASK:
Map each original ${type} to the MOST APPROPRIATE target category based on semantic meaning.
If a ${type} could fit multiple categories, choose the BEST single match.

OUTPUT FORMAT (JSON only, no explanation):
{
  "original_${type}_1": "Target Category",
  "original_${type}_2": "Target Category",
  ...
}

IMPORTANT:
- Every original ${type} MUST be mapped to exactly ONE target category
- Use exact category names from the list above
- Consider semantic meaning, not just string matching
- Be consistent: similar ${type}s should map to the same category`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        temperature: 0,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = message.content[0].text;

      // Extract JSON from response (handle markdown code blocks)
      let jsonText = responseText;
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const batchMapping = JSON.parse(jsonText);
      Object.assign(mapping, batchMapping);

      console.log(`  ✓ Mapped ${Object.keys(batchMapping).length} items`);

      // Show cost estimate
      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;
      const cost = (inputTokens * 0.00001 + outputTokens * 0.00005) / 100; // Haiku pricing
      console.log(`  Cost: $${cost.toFixed(4)} (${inputTokens} in / ${outputTokens} out)`);

    } catch (error) {
      console.error(`  ✗ Error processing batch ${batchIdx + 1}:`, error.message);

      // If batch fails, mark all items as "Other"
      batch.forEach(item => {
        mapping[item] = "Other";
      });
    }

    // Small delay between batches to avoid rate limits
    if (batchIdx < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return mapping;
}

// Main execution
async function main() {
  let totalCost = 0;

  // Consolidate keywords
  console.log('\n=== CONSOLIDATING KEYWORDS ===');
  const keywords = Object.keys(keywordFreq);
  const keywordMapping = await consolidateWithAI(keywords, keywordCategories, 'keyword');

  // Calculate stats
  const keywordStats = {};
  keywordCategories.forEach(cat => {
    keywordStats[cat] = { count: 0, original_keywords: [] };
  });

  Object.entries(keywordMapping).forEach(([keyword, category]) => {
    const freq = keywordFreq[keyword];
    keywordStats[category].count += freq;
    keywordStats[category].original_keywords.push(`${keyword} (${freq})`);
  });

  // Consolidate personas
  console.log('\n\n=== CONSOLIDATING PERSONAS ===');
  const personas = Object.keys(personaFreq);
  const personaMapping = await consolidateWithAI(personas, personaCategories, 'persona');

  // Calculate stats
  const personaStats = {};
  personaCategories.forEach(cat => {
    personaStats[cat] = { count: 0, original_personas: [] };
  });

  Object.entries(personaMapping).forEach(([persona, category]) => {
    const freq = personaFreq[persona];
    personaStats[category].count += freq;
    personaStats[category].original_personas.push(`${persona} (${freq})`);
  });

  // Save outputs
  const keywordOutput = {
    summary: {
      original_count: Object.keys(keywordMapping).length,
      consolidated_count: keywordCategories.length,
      reduction_pct: ((1 - keywordCategories.length / Object.keys(keywordMapping).length) * 100).toFixed(1)
    },
    mapping: keywordMapping,
    stats: keywordStats
  };

  const personaOutput = {
    summary: {
      original_count: Object.keys(personaMapping).length,
      consolidated_count: personaCategories.length,
      reduction_pct: ((1 - personaCategories.length / Object.keys(personaMapping).length) * 100).toFixed(1)
    },
    mapping: personaMapping,
    stats: personaStats
  };

  fs.writeFileSync('keyword_consolidation_map.json', JSON.stringify(keywordOutput, null, 2));
  fs.writeFileSync('persona_consolidation_map.json', JSON.stringify(personaOutput, null, 2));

  // Print summary
  console.log('\n\n✅ AI CONSOLIDATION COMPLETE!\n');

  console.log('=== KEYWORD CONSOLIDATION ===');
  console.log(`Original: ${keywordOutput.summary.original_count} unique keywords`);
  console.log(`Consolidated: ${keywordOutput.summary.consolidated_count} categories`);
  console.log(`Reduction: ${keywordOutput.summary.reduction_pct}%\n`);

  console.log('Top 10 keyword categories by frequency:');
  Object.entries(keywordStats)
    .filter(([cat]) => cat !== 'Other')
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([category, data], idx) => {
      const uniqueCount = data.original_keywords.length;
      console.log(`${idx + 1}. ${category}: ${data.count} occurrences (${uniqueCount} original keywords)`);
    });

  // Check if "Other" exists
  if (keywordStats.Other && keywordStats.Other.count > 0) {
    console.log(`\n⚠️  Other: ${keywordStats.Other.count} occurrences (${keywordStats.Other.original_keywords.length} keywords unmapped)`);
  }

  console.log('\n=== PERSONA CONSOLIDATION ===');
  console.log(`Original: ${personaOutput.summary.original_count} unique personas`);
  console.log(`Consolidated: ${personaOutput.summary.consolidated_count} categories`);
  console.log(`Reduction: ${personaOutput.summary.reduction_pct}%\n`);

  console.log('Top 10 persona categories by frequency:');
  Object.entries(personaStats)
    .filter(([cat]) => cat !== 'Other')
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([category, data], idx) => {
      const uniqueCount = data.original_personas.length;
      console.log(`${idx + 1}. ${category}: ${data.count} occurrences (${uniqueCount} original personas)`);
    });

  // Check if "Other" exists
  if (personaStats.Other && personaStats.Other.count > 0) {
    console.log(`\n⚠️  Other: ${personaStats.Other.count} occurrences (${personaStats.Other.original_personas.length} personas unmapped)`);
  }

  console.log('\n📝 Files updated:');
  console.log('  - keyword_consolidation_map.json');
  console.log('  - persona_consolidation_map.json');

  console.log('\n💡 Review these maps and approve before applying to events.');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
