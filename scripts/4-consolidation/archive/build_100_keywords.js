const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🎯 Building 100-keyword taxonomy with categories...\n');

// Load data
const events = JSON.parse(fs.readFileSync('sessions_with_logos.json', 'utf8'));
const exhibitors = JSON.parse(fs.readFileSync('expolist_enriched.json', 'utf8'));

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

console.log(`Found ${Object.keys(keywordFreq).length} unique keywords\n`);

// Get top keywords by frequency for context
const topKeywords = Object.entries(keywordFreq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 100);

console.log('Top 20 keywords by frequency:');
topKeywords.slice(0, 20).forEach(([kw, freq], idx) => {
  console.log(`${idx + 1}. ${kw} (${freq})`);
});
console.log('');

// STEP 1: Consolidate to 100 keywords
async function consolidateTo100Keywords() {
  console.log('🔍 STEP 1: Consolidating 1,624 keywords → 100 keywords using AI...\n');

  const allKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([kw, freq]) => `${kw} (${freq})`);

  const prompt = `You are consolidating keywords for an AI Summit event matching system.

TASK: Reduce 1,624 original keywords to EXACTLY 100 consolidated keywords.

CONTEXT: India AI Impact Summit 2026 - policy/business/tech conference
- 463 events, 715 exhibitors
- Focus: AI governance, enterprise adoption, startups, social impact, public infrastructure

ALL KEYWORDS WITH FREQUENCIES (top 200 shown):
${allKeywords.slice(0, 200).join('\n')}

CONSOLIDATION RULES:
1. Output EXACTLY 100 keywords
2. Keep high-frequency keywords (>50 occurrences) as-is when unique
3. Merge similar/overlapping keywords intelligently
   - Example: "generative ai", "gen ai", "llms" → "Generative AI"
   - Example: "ai governance", "ai regulation" → "AI Governance"
4. Use professional, clear naming (Title Case)
5. Cover all major domains (governance, tech, sectors, skills, etc.)
6. Prioritize keywords with high occurrence counts

OUTPUT FORMAT (JSON only, no explanations):
{
  "consolidated_keywords": [
    {
      "keyword": "Generative AI",
      "original_keywords": ["generative ai", "gen ai", "llm"],
      "total_occurrences": 180
    },
    ...exactly 100 items
  ]
}

CRITICAL: Output EXACTLY 100 keywords. No more, no less.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16000,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || responseText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[1]);

    console.log(`✓ Consolidated to ${result.consolidated_keywords.length} keywords\n`);

    if (result.consolidated_keywords.length !== 100) {
      console.log(`⚠️  Warning: Got ${result.consolidated_keywords.length} keywords instead of 100`);
    }

    const cost = (message.usage.input_tokens * 0.00001 + message.usage.output_tokens * 0.00005) / 100;
    console.log(`Cost: $${cost.toFixed(4)}\n`);

    return result.consolidated_keywords;

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// STEP 2: Create 10-12 MECE categories
async function createMECECategories(consolidatedKeywords) {
  console.log('🔍 STEP 2: Creating 10-12 MECE categories...\n');

  const keywordList = consolidatedKeywords.map(k => k.keyword);

  const prompt = `You are designing a MECE (Mutually Exclusive, Collectively Exhaustive) category structure.

100 CONSOLIDATED KEYWORDS:
${keywordList.join(', ')}

TASK: Create 10-12 top-level categories that:
1. Are MECE (mutually exclusive, collectively exhaustive)
2. Each keyword fits into EXACTLY ONE category
3. Categories are balanced (8-12 keywords each)
4. Use clear, professional naming
5. Can use compound names if needed (e.g., "AI Governance & Ethics")

REQUIREMENTS:
- Output 10-12 categories (not more, not less)
- Each category should have a clear definition
- Think about how users naturally categorize AI topics
- Consider: technology, governance, industries, skills, infrastructure, impact

OUTPUT FORMAT (JSON only):
{
  "categories": [
    {
      "name": "Category Name",
      "description": "1-sentence definition",
      "expected_keywords": 10
    }
  ]
}

Output EXACTLY 10-12 categories.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || responseText.match(/(\{[\s\S]*\})/);
    const result = JSON.parse(jsonMatch[1]);

    console.log(`✓ Created ${result.categories.length} MECE categories:\n`);
    result.categories.forEach((cat, idx) => {
      console.log(`${idx + 1}. ${cat.name} (~${cat.expected_keywords} keywords)`);
      console.log(`   ${cat.description}\n`);
    });

    const cost = (message.usage.input_tokens * 0.00001 + message.usage.output_tokens * 0.00005) / 100;
    console.log(`Cost: $${cost.toFixed(4)}\n`);

    return result.categories;

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// STEP 3: Map 100 keywords to categories
async function mapKeywordsToCategories(consolidatedKeywords, categories) {
  console.log('🔍 STEP 3: Mapping 100 keywords to categories...\n');

  const keywordList = consolidatedKeywords.map(k => k.keyword);
  const categoryNames = categories.map(c => c.name);

  const prompt = `You are assigning keywords to categories.

CATEGORIES (${categoryNames.length}):
${categories.map((c, i) => `${i + 1}. ${c.name} - ${c.description}`).join('\n')}

KEYWORDS TO ASSIGN (${keywordList.length}):
${keywordList.join(', ')}

TASK: Assign each keyword to EXACTLY ONE category.

RULES:
- Every keyword must be assigned
- Each keyword goes to exactly one category
- Aim for balanced distribution (8-12 keywords per category)
- Use best semantic fit

OUTPUT FORMAT (JSON only):
{
  "Generative AI": "AI Technology & Models",
  "AI Governance": "Governance & Policy",
  ...
}

Map all ${keywordList.length} keywords.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || responseText.match(/(\{[\s\S]*\})/);
    const keywordToCategoryMap = JSON.parse(jsonMatch[1]);

    console.log(`✓ Mapped ${Object.keys(keywordToCategoryMap).length} keywords to categories\n`);

    const cost = (message.usage.input_tokens * 0.00001 + message.usage.output_tokens * 0.00005) / 100;
    console.log(`Cost: $${cost.toFixed(4)}\n`);

    return keywordToCategoryMap;

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// STEP 4: Build reverse mapping (original → consolidated)
function buildOriginalToConsolidatedMap(consolidatedKeywords) {
  console.log('🔍 STEP 4: Building original → consolidated keyword map...\n');

  const originalToConsolidated = {};

  consolidatedKeywords.forEach(consolidated => {
    consolidated.original_keywords.forEach(original => {
      originalToConsolidated[original.toLowerCase().trim()] = consolidated.keyword;
    });
  });

  console.log(`✓ Mapped ${Object.keys(originalToConsolidated).length} original keywords\n`);

  return originalToConsolidated;
}

// Generate statistics
function generateStats(consolidatedKeywords, categories, keywordToCategoryMap) {
  const stats = {
    total_keywords: consolidatedKeywords.length,
    total_categories: categories.length,
    category_distribution: {}
  };

  // Count keywords per category
  Object.values(keywordToCategoryMap).forEach(category => {
    stats.category_distribution[category] = (stats.category_distribution[category] || 0) + 1;
  });

  return stats;
}

// Main execution
async function main() {
  try {
    // Step 1: Consolidate to 100 keywords
    const consolidatedKeywords = await consolidateTo100Keywords();

    // Step 2: Create MECE categories
    const categories = await createMECECategories(consolidatedKeywords);

    // Step 3: Map keywords to categories
    const keywordToCategoryMap = await mapKeywordsToCategories(consolidatedKeywords, categories);

    // Step 4: Build reverse mapping
    const originalToConsolidated = buildOriginalToConsolidatedMap(consolidatedKeywords);

    // Generate stats
    const stats = generateStats(consolidatedKeywords, categories, keywordToCategoryMap);

    // Build final structure
    const output = {
      metadata: {
        total_categories: categories.length,
        total_keywords: consolidatedKeywords.length,
        total_original_keywords: Object.keys(originalToConsolidated).length,
        generated_at: new Date().toISOString()
      },
      categories: categories,
      keywords: consolidatedKeywords.map(kw => ({
        keyword: kw.keyword,
        category: keywordToCategoryMap[kw.keyword],
        original_keywords: kw.original_keywords,
        total_occurrences: kw.total_occurrences
      })),
      mappings: {
        original_to_consolidated: originalToConsolidated,
        keyword_to_category: keywordToCategoryMap
      },
      stats: stats
    };

    // Save output
    fs.writeFileSync('keyword_taxonomy_100.json', JSON.stringify(output, null, 2));

    // Print summary
    console.log('✅ 100-KEYWORD TAXONOMY COMPLETE!\n');
    console.log('=== SUMMARY ===');
    console.log(`Categories: ${stats.total_categories}`);
    console.log(`Consolidated Keywords: ${stats.total_keywords}`);
    console.log(`Original Keywords Mapped: ${Object.keys(originalToConsolidated).length}\n`);

    console.log('=== CATEGORY DISTRIBUTION ===');
    Object.entries(stats.category_distribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`${category}: ${count} keywords`);
      });

    console.log('\n📝 Output saved to: keyword_taxonomy_100.json');
    console.log('💡 Review and approve before updating event JSON');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
