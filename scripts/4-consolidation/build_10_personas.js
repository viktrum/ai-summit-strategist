const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🎯 Building 22-Persona Taxonomy...\n');

// Load data
const events = JSON.parse(fs.readFileSync('sessions_with_logos.json', 'utf8'));
const exhibitors = JSON.parse(fs.readFileSync('expolist_enriched.json', 'utf8'));

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

console.log(`Found ${Object.keys(personaFreq).length} unique personas\n`);

// Get top personas for context
const topPersonas = Object.entries(personaFreq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 50);

console.log('Top 20 personas by frequency:');
topPersonas.slice(0, 20).forEach(([p, freq], idx) => {
  console.log(`${idx + 1}. ${p} (${freq})`);
});
console.log('');

// Consolidate to 22 categories
async function consolidateTo22Personas() {
  console.log('🔍 Consolidating 1,221 personas → 22 categories...\n');

  const allPersonas = Object.entries(personaFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([p, freq]) => `${p} (${freq})`);

  const prompt = `You are consolidating personas for an AI Summit event matching system.

TASK: Group 1,221 unique personas into EXACTLY 22 categories.

CONTEXT: India AI Impact Summit 2026 - tech/business/policy conference
Core audience: Founders, enterprise leaders, engineers, product managers, researchers

TOP 50 PERSONAS (by frequency):
${allPersonas.slice(0, 50).join('\n')}

REQUIRED 22 CATEGORIES (use these EXACT category names):

FOUNDERS & STARTUPS (3 categories):
1. "Early-Stage Founders" - Pre-seed, seed, MVP stage, includes solopreneurs
2. "Growth-Stage Founders" - Series A+, scaling companies
3. "Technical Founders" - Engineer/researcher background founders

ENTERPRISE LEADERSHIP (3 categories):
4. "C-Suite Executives" - CEO, COO, CFO, CMO
5. "Technology Leaders" - CTO, CIO, VP Engineering, CISO, Tech Directors
6. "Innovation & Strategy Leaders" - Chief Innovation Officer, Chief AI Officer, Strategy heads

PRODUCT (2 categories):
7. "AI Product Managers" - Building AI products specifically
8. "Product Managers" - General PM role, using AI tools

ENGINEERING (4 categories):
9. "ML Engineers" - Training models, MLOps, AI infrastructure
10. "Data Scientists" - Analytics, experimentation, data modeling
11. "Backend Engineers" - APIs, infrastructure, distributed systems
12. "Frontend & Full-Stack Engineers" - Web, mobile, UI/UX engineering

RESEARCH & ACADEMIA (2 categories):
13. "AI Researchers" - Research labs, publishing, includes PhD students
14. "Academic Faculty" - Professors, lecturers, teaching + research

OTHER SECTORS (8 categories):
15. "Government & Policy Leaders" - Officials, regulators, policymakers merged
16. "Investors & VCs" - Angels, fund managers, impact investors
17. "Consultants & Advisors" - Strategy, implementation, advisory
18. "Healthcare Professionals" - Doctors, hospital admins, health IT
19. "Educators" - Teachers, edtech, training professionals
20. "Students" - Undergrad, grad students
21. "Media & Analysts" - Journalists, industry analysts
22. "NGO & Social Sector" - Non-profit leaders, development orgs

OUTPUT FORMAT (JSON only):
{
  "persona_categories": [
    {
      "category": "Early-Stage Founders",
      "description": "Pre-seed and seed stage founders building MVPs, includes solopreneurs and indie hackers",
      "includes": ["early-stage founders", "pre-seed founders", "seed founders", "solopreneurs", "indie hackers"]
    }
  ]
}

CRITICAL:
- Use EXACTLY these 22 category names (copy them exactly)
- Output all 22 categories
- Map personas intelligently to best fit`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;

    // Extract JSON
    let result;
    try {
      const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        const jsonStr = codeBlockMatch[1]
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']');
        result = JSON.parse(jsonStr);
      } else {
        const jsonMatch = responseText.match(/\{[\s\S]*?\n\s*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0]
            .replace(/,(\s*[}\]])/g, '$1')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          result = JSON.parse(jsonStr);
        } else {
          throw new Error('No valid JSON found');
        }
      }
    } catch (parseError) {
      console.log('  JSON parse error:', parseError.message);
      console.log('  Response preview:', responseText.substring(0, 1000));
      throw parseError;
    }

    console.log(`✓ Created ${result.persona_categories.length} persona categories:\n`);

    result.persona_categories.forEach((cat, idx) => {
      console.log(`${idx + 1}. ${cat.category}`);
      console.log(`   ${cat.description}`);
      console.log(`   Includes: ${cat.includes.join(', ')}\n`);
    });

    const cost = (message.usage.input_tokens * 0.00001 + message.usage.output_tokens * 0.00005) / 100;
    console.log(`Cost: $${cost.toFixed(4)}\n`);

    return result.persona_categories;

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Map all personas to the 22 categories
async function mapPersonasToCategories(personaCategories) {
  console.log('🔍 Mapping all 1,221 personas to the 22 categories...\n');

  const allPersonas = Object.keys(personaFreq);
  const categoryNames = personaCategories.map(c => c.category);

  // Process in batches
  const batchSize = 200;
  const batches = [];

  for (let i = 0; i < allPersonas.length; i += batchSize) {
    batches.push(allPersonas.slice(i, i + batchSize));
  }

  console.log(`Processing in ${batches.length} batches...\n`);

  const mapping = {};
  let totalCost = 0;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    console.log(`Batch ${batchIdx + 1}/${batches.length} (${batch.length} personas)...`);

    const prompt = `You are mapping personas to consolidated categories.

22 PERSONA CATEGORIES:
${personaCategories.map((c, i) => `${i + 1}. ${c.category} - ${c.description}`).join('\n')}

PERSONAS TO MAP (${batch.length}):
${batch.join('\n')}

TASK: Map each persona to the MOST APPROPRIATE category.

RULES:
- Every persona to exactly one category
- Use best semantic fit
- Be generous with interpretation (e.g., "AI Product Manager" → Tech Practitioners)

OUTPUT FORMAT (JSON only):
{
  "Persona Name 1": "Category Name",
  "Persona Name 2": "Category Name"
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = message.content[0].text;

      // Extract JSON
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || responseText.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) {
        console.log('  ⚠️  No JSON found, skipping batch');
        continue;
      }

      const cleanedJson = jsonMatch[1]
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

      const batchMapping = JSON.parse(cleanedJson);
      Object.assign(mapping, batchMapping);

      const cost = (message.usage.input_tokens * 0.00001 + message.usage.output_tokens * 0.00005) / 100;
      totalCost += cost;
      console.log(`  ✓ Mapped ${Object.keys(batchMapping).length} personas. Cost: $${cost.toFixed(4)}`);

      // Small delay
      if (batchIdx < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error(`  ✗ Error:`, error.message);
    }
  }

  console.log(`\nTotal mapping cost: $${totalCost.toFixed(4)}\n`);
  console.log(`✓ Mapped ${Object.keys(mapping).length} personas\n`);

  return mapping;
}

// Generate statistics
function generateStats(personaCategories, personaMapping, personaFreq) {
  const stats = {
    total_categories: personaCategories.length,
    total_personas_mapped: Object.keys(personaMapping).length,
    coverage_pct: (Object.keys(personaMapping).length / Object.keys(personaFreq).length * 100).toFixed(1),
    category_distribution: {}
  };

  // Count personas and occurrences per category
  Object.entries(personaMapping).forEach(([persona, category]) => {
    if (!stats.category_distribution[category]) {
      stats.category_distribution[category] = {
        personas: 0,
        occurrences: 0,
        sample_personas: []
      };
    }

    stats.category_distribution[category].personas++;
    stats.category_distribution[category].occurrences += personaFreq[persona] || 0;

    // Keep sample personas (top 5 by frequency)
    if (stats.category_distribution[category].sample_personas.length < 5) {
      stats.category_distribution[category].sample_personas.push({
        persona: persona,
        freq: personaFreq[persona] || 0
      });
    }
  });

  // Sort sample personas by frequency
  Object.values(stats.category_distribution).forEach(cat => {
    cat.sample_personas.sort((a, b) => b.freq - a.freq);
  });

  return stats;
}

// Main execution
async function main() {
  try {
    // Step 1: Create 22 persona categories
    const personaCategories = await consolidateTo22Personas();

    // Step 2: Map all personas to categories
    const personaMapping = await mapPersonasToCategories(personaCategories);

    // Step 3: Generate stats
    const stats = generateStats(personaCategories, personaMapping, personaFreq);

    // Build output
    const output = {
      metadata: {
        total_categories: stats.total_categories,
        total_personas_mapped: stats.total_personas_mapped,
        total_unique_personas: Object.keys(personaFreq).length,
        coverage_percentage: stats.coverage_pct,
        generated_at: new Date().toISOString()
      },
      categories: personaCategories,
      mappings: {
        persona_to_category: personaMapping
      },
      stats: stats
    };

    // Save
    fs.writeFileSync('persona_taxonomy_22.json', JSON.stringify(output, null, 2));

    // Summary
    console.log('✅ 22-PERSONA TAXONOMY COMPLETE!\n');
    console.log('=== SUMMARY ===');
    console.log(`Categories: ${stats.total_categories}`);
    console.log(`Personas Mapped: ${stats.total_personas_mapped} / ${Object.keys(personaFreq).length} (${stats.coverage_pct}%)\n`);

    console.log('=== CATEGORY DISTRIBUTION ===');
    Object.entries(stats.category_distribution)
      .sort((a, b) => b[1].occurrences - a[1].occurrences)
      .forEach(([category, data]) => {
        console.log(`${category}:`);
        console.log(`  ${data.personas} personas, ${data.occurrences} occurrences`);
        console.log(`  Top: ${data.sample_personas.slice(0, 3).map(p => p.persona).join(', ')}`);
        console.log('');
      });

    console.log('📝 Output saved to: persona_taxonomy_22.json');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
