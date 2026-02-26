const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🏗️  Building 2-level keyword hierarchy using AI...\n');

// Load data
const vocabulary = JSON.parse(fs.readFileSync('vocabulary.json', 'utf8'));
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

// STEP 1: Build top-level categories
async function buildTopLevelCategories() {
  console.log('🔍 STEP 1: Building top-level categories...\n');

  // Get top 50 most frequent keywords to understand domain
  const topKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([kw, freq]) => `${kw} (${freq})`);

  const prompt = `You are designing a keyword taxonomy for an AI Summit event matching system.

CONTEXT: This is the India AI Impact Summit 2026 - a major policy/business/tech conference with:
- 463 events
- 715 exhibitors
- Focus areas: AI governance, enterprise adoption, startups, social impact, public infrastructure

TOP 50 KEYWORDS BY FREQUENCY:
${topKeywords.join('\n')}

TASK: Design 8-10 TOP-LEVEL CATEGORIES that cover the entire domain.

REQUIREMENTS:
- Each category should be broad enough to contain 8-12 subcategories
- Categories should be mutually exclusive (minimal overlap)
- Use clear, professional naming
- Think about how users would naturally think about AI topics
- Target: ~100 total subcategories across all categories

OUTPUT FORMAT (JSON only):
{
  "categories": [
    {
      "name": "Category Name",
      "description": "1-sentence description",
      "estimated_subcategories": 10
    }
  ]
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || responseText.match(/(\{[\s\S]*\})/);
    const result = JSON.parse(jsonMatch ? jsonMatch[1] : responseText);

    console.log(`✓ Designed ${result.categories.length} top-level categories\n`);

    result.categories.forEach((cat, idx) => {
      console.log(`${idx + 1}. ${cat.name} (~${cat.estimated_subcategories} subcategories)`);
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

// STEP 2: Assign all keywords to categories and subcategories
async function assignKeywordsToHierarchy(categories) {
  console.log('🔍 STEP 2: Assigning keywords to hierarchy...\n');

  const allKeywords = Object.keys(keywordFreq);
  const batchSize = 150;  // Reduced for better JSON reliability
  const batches = [];

  for (let i = 0; i < allKeywords.length; i += batchSize) {
    batches.push(allKeywords.slice(i, i + batchSize));
  }

  console.log(`Processing ${allKeywords.length} keywords in ${batches.length} batches\n`);

  const hierarchy = {};
  categories.forEach(cat => {
    hierarchy[cat.name] = {};
  });

  let totalCost = 0;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    console.log(`Batch ${batchIdx + 1}/${batches.length} (${batch.length} keywords)...`);

    const categoryNames = categories.map(c => c.name).join(', ');

    const prompt = `You are organizing keywords into a 2-level hierarchy for an AI Summit.

TOP-LEVEL CATEGORIES:
${categories.map((c, i) => `${i + 1}. ${c.name} - ${c.description}`).join('\n')}

KEYWORDS TO CATEGORIZE (${batch.length} items):
${batch.join('\n')}

TASK:
1. Assign each keyword to ONE top-level category
2. Create a subcategory name for the keyword (can reuse subcategories)
3. Subcategories should be specific but reusable (e.g., "Generative AI", "Computer Vision")

RULES:
- Similar keywords should map to the SAME subcategory
- Subcategory names should be professional and clear
- Aim for 8-12 subcategories per top-level category

CRITICAL: Output ONLY valid JSON. No trailing commas, no comments, no explanations.

OUTPUT FORMAT:
{
  "keyword1": {"category": "Category Name", "subcategory": "Subcategory Name"},
  "keyword2": {"category": "Category Name", "subcategory": "Subcategory Name"}
}

Output the JSON now:`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,  // Increased for large JSON output
        temperature: 0.1,  // Lower temperature for more consistent formatting
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = message.content[0].text;

      // Try multiple JSON extraction strategies
      let batchResult;
      try {
        // Strategy 1: Extract from code block
        const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (codeBlockMatch) {
          batchResult = JSON.parse(codeBlockMatch[1]);
        } else {
          // Strategy 2: Extract first complete JSON object
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            // Remove trailing commas before parsing
            const cleanedJson = jsonMatch[0]
              .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas before } or ]
              .replace(/,\s*}/g, '}')
              .replace(/,\s*]/g, ']');
            batchResult = JSON.parse(cleanedJson);
          } else {
            throw new Error('No JSON found in response');
          }
        }
      } catch (parseError) {
        console.log(`  ⚠️  JSON parse error: ${parseError.message}`);
        console.log(`  Raw response preview: ${responseText.substring(0, 200)}...`);
        throw parseError;
      }

      // Add to hierarchy
      Object.entries(batchResult).forEach(([keyword, assignment]) => {
        const category = assignment.category;
        const subcategory = assignment.subcategory;

        if (!hierarchy[category]) {
          console.log(`  ⚠️  Unknown category: ${category} (creating it)`);
          hierarchy[category] = {};
        }

        if (!hierarchy[category][subcategory]) {
          hierarchy[category][subcategory] = [];
        }

        hierarchy[category][subcategory].push(keyword);
      });

      const cost = (message.usage.input_tokens * 0.00001 + message.usage.output_tokens * 0.00005) / 100;
      totalCost += cost;
      console.log(`  ✓ Processed. Cost: $${cost.toFixed(4)}`);

      // Small delay
      if (batchIdx < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error(`  ✗ Error:`, error.message);
      // Mark failed keywords
      batch.forEach(kw => {
        if (!hierarchy['Uncategorized']) hierarchy['Uncategorized'] = {};
        if (!hierarchy['Uncategorized']['Other']) hierarchy['Uncategorized']['Other'] = [];
        hierarchy['Uncategorized']['Other'].push(kw);
      });
    }
  }

  console.log(`\nTotal cost: $${totalCost.toFixed(4)}\n`);

  return hierarchy;
}

// STEP 3: Generate statistics
function generateStats(hierarchy, keywordFreq) {
  console.log('📊 STEP 3: Generating statistics...\n');

  const stats = {
    total_categories: Object.keys(hierarchy).length,
    total_subcategories: 0,
    total_keywords: 0,
    categories: {}
  };

  Object.entries(hierarchy).forEach(([category, subcategories]) => {
    const categoryStats = {
      subcategories: Object.keys(subcategories).length,
      keywords: 0,
      occurrences: 0,
      subcategory_details: {}
    };

    Object.entries(subcategories).forEach(([subcategory, keywords]) => {
      const subcategoryStats = {
        keywords: keywords.length,
        occurrences: keywords.reduce((sum, kw) => sum + (keywordFreq[kw] || 0), 0),
        top_keywords: keywords
          .map(kw => ({ keyword: kw, freq: keywordFreq[kw] || 0 }))
          .sort((a, b) => b.freq - a.freq)
          .slice(0, 5)
          .map(x => `${x.keyword} (${x.freq})`)
      };

      categoryStats.keywords += subcategoryStats.keywords;
      categoryStats.occurrences += subcategoryStats.occurrences;
      categoryStats.subcategory_details[subcategory] = subcategoryStats;
    });

    stats.total_subcategories += categoryStats.subcategories;
    stats.total_keywords += categoryStats.keywords;
    stats.categories[category] = categoryStats;
  });

  return stats;
}

// Main execution
async function main() {
  try {
    // Step 1: Design top-level categories
    const categories = await buildTopLevelCategories();

    // Step 2: Assign all keywords to hierarchy
    const hierarchy = await assignKeywordsToHierarchy(categories);

    // Step 3: Generate stats
    const stats = generateStats(hierarchy, keywordFreq);

    // Save outputs
    const output = {
      metadata: {
        total_categories: stats.total_categories,
        total_subcategories: stats.total_subcategories,
        total_keywords: stats.total_keywords,
        generated_at: new Date().toISOString()
      },
      hierarchy: hierarchy,
      stats: stats
    };

    fs.writeFileSync('keyword_hierarchy.json', JSON.stringify(output, null, 2));

    // Print summary
    console.log('✅ KEYWORD HIERARCHY COMPLETE!\n');
    console.log('=== SUMMARY ===');
    console.log(`Categories: ${stats.total_categories}`);
    console.log(`Subcategories: ${stats.total_subcategories}`);
    console.log(`Keywords mapped: ${stats.total_keywords}\n`);

    console.log('=== CATEGORY BREAKDOWN ===\n');
    Object.entries(stats.categories)
      .sort((a, b) => b[1].occurrences - a[1].occurrences)
      .forEach(([category, data]) => {
        console.log(`${category}:`);
        console.log(`  - ${data.subcategories} subcategories`);
        console.log(`  - ${data.keywords} keywords`);
        console.log(`  - ${data.occurrences} occurrences`);

        // Show top 3 subcategories
        const topSubs = Object.entries(data.subcategory_details)
          .sort((a, b) => b[1].occurrences - a[1].occurrences)
          .slice(0, 3);

        console.log(`  Top subcategories:`);
        topSubs.forEach(([subcat, substats]) => {
          console.log(`    • ${subcat}: ${substats.occurrences} occurrences (${substats.keywords} keywords)`);
        });
        console.log('');
      });

    console.log('📝 Output saved to: keyword_hierarchy.json');
    console.log('💡 Review and approve before proceeding to persona consolidation');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
