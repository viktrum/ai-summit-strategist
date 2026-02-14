const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🎯 Building 100-keyword taxonomy (Two-Pass Approach)...\n');

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

// Separate frequent and rare keywords
const frequentKeywords = Object.entries(keywordFreq)
  .filter(([kw, freq]) => freq >= 3)
  .sort((a, b) => b[1] - a[1]);

const rareKeywords = Object.entries(keywordFreq)
  .filter(([kw, freq]) => freq < 3)
  .sort((a, b) => b[1] - a[1]);

console.log(`Total keywords: ${Object.keys(keywordFreq).length}`);
console.log(`Frequent keywords (3+ occurrences): ${frequentKeywords.length}`);
console.log(`Rare keywords (1-2 occurrences): ${rareKeywords.length}\n`);

// PASS 1: Consolidate frequent keywords to 100
async function consolidateFrequentKeywords() {
  console.log('🔍 PASS 1: Consolidating top ${frequentKeywords.length} keywords → 100 keywords...\n');

  const frequentList = frequentKeywords.map(([kw, freq]) => `${kw} (${freq})`);

  const prompt = `You are consolidating keywords for an AI Summit event matching system.

TASK: Reduce ${frequentKeywords.length} frequent keywords to EXACTLY 100 consolidated keywords.

FREQUENT KEYWORDS (3+ occurrences each):
${frequentList.join('\n')}

CONSOLIDATION RULES:
1. Output EXACTLY 100 keywords
2. Keep very high-frequency keywords (>50 occurrences) as-is unless duplicates exist
3. Merge similar/overlapping keywords intelligently:
   - "generative ai" + "gen ai" + "llm" → "Generative AI"
   - "ai governance" + "ai regulation" → "AI Governance"
4. Use professional Title Case naming
5. Ensure coverage across all domains (tech, governance, sectors, skills, infrastructure, impact)
6. Prioritize by occurrence count - high-frequency keywords must be preserved

OUTPUT FORMAT (JSON only, no explanations):
{
  "consolidated_keywords": [
    {
      "keyword": "Generative AI",
      "original_keywords": ["generative ai", "gen ai", "llm"],
      "total_occurrences": 180
    }
  ]
}

CRITICAL: Output EXACTLY 100 keywords. Count them before submitting.`;

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

    if (result.consolidated_keywords.length < 90) {
      console.log(`⚠️  Warning: Got ${result.consolidated_keywords.length} keywords (target 100). Re-running...\n`);
      // Could implement retry logic here
    }

    const cost = (message.usage.input_tokens * 0.00001 + message.usage.output_tokens * 0.00005) / 100;
    console.log(`Cost: $${cost.toFixed(4)}\n`);

    // Show top 10
    console.log('Top 10 consolidated keywords:');
    result.consolidated_keywords.slice(0, 10).forEach((k, idx) => {
      console.log(`${idx + 1}. ${k.keyword} (${k.total_occurrences} occurrences)`);
    });
    console.log('');

    return result.consolidated_keywords;

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// PASS 2: Map rare keywords to the 100
async function mapRareKeywords(consolidatedKeywords) {
  console.log(`🔍 PASS 2: Mapping ${rareKeywords.length} rare keywords to the 100...\n`);

  const consolidatedList = consolidatedKeywords.map(k => k.keyword);
  const mapping = {};

  // Process in batches
  const batchSize = 200;
  const batches = [];

  for (let i = 0; i < rareKeywords.length; i += batchSize) {
    batches.push(rareKeywords.slice(i, i + batchSize));
  }

  console.log(`Processing in ${batches.length} batches...\n`);

  let totalCost = 0;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const batchKeywords = batch.map(([kw]) => kw);

    console.log(`Batch ${batchIdx + 1}/${batches.length} (${batch.length} keywords)...`);

    const prompt = `You are mapping rare keywords to consolidated keywords.

100 CONSOLIDATED KEYWORDS:
${consolidatedList.join(', ')}

RARE KEYWORDS TO MAP (${batchKeywords.length}):
${batchKeywords.join(', ')}

TASK: Map each rare keyword to the MOST SEMANTICALLY SIMILAR consolidated keyword.

RULES:
- Every rare keyword must map to exactly one consolidated keyword
- Use best semantic fit (e.g., "machine learning" → "AI Technology", "climate change" → "Climate Tech")
- If no good match exists, use the most general relevant keyword
- Prioritize accuracy over distribution

OUTPUT FORMAT (JSON only):
{
  "rare_keyword_1": "Consolidated Keyword Name",
  "rare_keyword_2": "Consolidated Keyword Name"
}

Map all ${batchKeywords.length} keywords.`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = message.content[0].text;
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || responseText.match(/(\{[\s\S]*\})/);

      if (!jsonMatch) {
        console.log(`  ⚠️  No JSON found, skipping batch`);
        continue;
      }

      const batchMapping = JSON.parse(jsonMatch[1]);
      Object.assign(mapping, batchMapping);

      const cost = (message.usage.input_tokens * 0.00001 + message.usage.output_tokens * 0.00005) / 100;
      totalCost += cost;
      console.log(`  ✓ Mapped ${Object.keys(batchMapping).length} keywords. Cost: $${cost.toFixed(4)}`);

      // Small delay
      if (batchIdx < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error(`  ✗ Error:`, error.message);
    }
  }

  console.log(`\nPass 2 total cost: $${totalCost.toFixed(4)}\n`);
  console.log(`✓ Mapped ${Object.keys(mapping).length} rare keywords\n`);

  return mapping;
}

// Create MECE categories
async function createMECECategories(consolidatedKeywords) {
  console.log('🔍 STEP 3: Creating 10-12 MECE categories...\n');

  const keywordList = consolidatedKeywords.map(k => k.keyword);

  const prompt = `You are designing a MECE (Mutually Exclusive, Collectively Exhaustive) category structure.

${keywordList.length} CONSOLIDATED KEYWORDS:
${keywordList.join(', ')}

TASK: Create 10-12 top-level categories that:
1. Are MECE (mutually exclusive, collectively exhaustive)
2. Each keyword fits into EXACTLY ONE category
3. Categories are balanced (7-12 keywords each)
4. Use clear, professional naming
5. Can use compound names if needed (e.g., "AI Governance & Ethics")

REQUIREMENTS:
- Output 10-12 categories
- Each category has clear definition
- Think about user mental models for AI topics
- Consider: technology, governance, industries, skills, infrastructure, impact, geopolitics

OUTPUT FORMAT - EXACTLY THIS STRUCTURE (JSON only, no extra fields):
{
  "categories": [
    {"name": "Category Name 1", "description": "Clear 1-sentence definition"},
    {"name": "Category Name 2", "description": "Clear 1-sentence definition"}
  ]
}

CRITICAL:
- Output ONLY name and description fields
- Do NOT include keywords, examples, or any other fields
- Ensure valid JSON with proper commas
- Output 10-12 categories`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;

    // Try to extract JSON
    let result;
    try {
      // Strategy 1: Look for code block
      const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        const jsonStr = codeBlockMatch[1]
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
          .replace(/\n\s*}/g, '}')  // Clean up formatting
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']');
        result = JSON.parse(jsonStr);
      } else {
        // Strategy 2: Find first complete JSON object
        const jsonMatch = responseText.match(/\{[\s\S]*?\n\s*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0]
            .replace(/,(\s*[}\]])/g, '$1')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          result = JSON.parse(jsonStr);
        } else {
          console.log('  Response preview:', responseText.substring(0, 500));
          throw new Error('No valid JSON found in response');
        }
      }
    } catch (parseError) {
      console.log('  JSON parse error:', parseError.message);
      console.log('  Response text:', responseText.substring(0, 1000));
      throw parseError;
    }

    console.log(`✓ Created ${result.categories.length} MECE categories:\n`);
    result.categories.forEach((cat, idx) => {
      console.log(`${idx + 1}. ${cat.name}`);
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

// Map 100 keywords to categories
async function mapKeywordsToCategories(consolidatedKeywords, categories) {
  console.log('🔍 STEP 4: Mapping keywords to categories...\n');

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
- Each keyword to exactly one category
- Aim for balanced distribution
- Use best semantic fit

OUTPUT FORMAT (JSON only):
{
  "Generative AI": "AI Technology & Infrastructure",
  "AI Governance": "Governance & Policy"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || responseText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    // Clean JSON
    const cleanedJson = jsonMatch[1]
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');

    const keywordToCategoryMap = JSON.parse(cleanedJson);

    console.log(`✓ Mapped ${Object.keys(keywordToCategoryMap).length} keywords to categories\n`);

    const cost = (message.usage.input_tokens * 0.00001 + message.usage.output_tokens * 0.00005) / 100;
    console.log(`Cost: $${cost.toFixed(4)}\n`);

    return keywordToCategoryMap;

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    // Pass 1: Consolidate frequent keywords
    const consolidatedKeywords = await consolidateFrequentKeywords();

    // Pass 2: Map rare keywords
    const rareMapping = await mapRareKeywords(consolidatedKeywords);

    // Step 3: Create MECE categories
    const categories = await createMECECategories(consolidatedKeywords);

    // Step 4: Map to categories
    const keywordToCategoryMap = await mapKeywordsToCategories(consolidatedKeywords, categories);

    // Build complete mapping: original → consolidated
    const originalToConsolidated = {};

    // Add frequent keywords
    consolidatedKeywords.forEach(consolidated => {
      consolidated.original_keywords.forEach(original => {
        originalToConsolidated[original.toLowerCase().trim()] = consolidated.keyword;
      });
    });

    // Add rare keywords
    Object.assign(originalToConsolidated, rareMapping);

    // Calculate stats
    const stats = {
      total_categories: categories.length,
      total_keywords: consolidatedKeywords.length,
      total_original_keywords: Object.keys(originalToConsolidated).length,
      coverage_pct: (Object.keys(originalToConsolidated).length / Object.keys(keywordFreq).length * 100).toFixed(1),
      category_distribution: {}
    };

    Object.values(keywordToCategoryMap).forEach(category => {
      stats.category_distribution[category] = (stats.category_distribution[category] || 0) + 1;
    });

    // Build final output
    const output = {
      metadata: {
        total_categories: categories.length,
        total_keywords: consolidatedKeywords.length,
        total_original_keywords: Object.keys(originalToConsolidated).length,
        coverage_percentage: stats.coverage_pct,
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

    // Save
    fs.writeFileSync('keyword_taxonomy_100.json', JSON.stringify(output, null, 2));

    // Summary
    console.log('✅ 100-KEYWORD TAXONOMY COMPLETE!\n');
    console.log('=== SUMMARY ===');
    console.log(`Categories: ${stats.total_categories}`);
    console.log(`Consolidated Keywords: ${stats.total_keywords}`);
    console.log(`Original Keywords Mapped: ${stats.total_original_keywords} / ${Object.keys(keywordFreq).length} (${stats.coverage_pct}%)\n`);

    console.log('=== CATEGORY DISTRIBUTION ===');
    Object.entries(stats.category_distribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`${category}: ${count} keywords`);
      });

    console.log('\n📝 Output saved to: keyword_taxonomy_100.json');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
