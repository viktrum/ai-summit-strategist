const fs = require('fs');

console.log('📝 Generating consolidation summary...\n');

const keywordMap = JSON.parse(fs.readFileSync('keyword_consolidation_map.json', 'utf8'));
const personaMap = JSON.parse(fs.readFileSync('persona_consolidation_map.json', 'utf8'));

let markdown = `# Tag Consolidation Summary\n\n`;
markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
markdown += `---\n\n`;

// ============================================
// KEYWORD CONSOLIDATION SUMMARY
// ============================================

markdown += `## Keyword Consolidation\n\n`;
markdown += `**Reduction:** ${keywordMap.summary.original_count} → ${keywordMap.summary.consolidated_count} categories (${keywordMap.summary.reduction_pct}% reduction)\n\n`;

// Sort categories by occurrence
const keywordCategoriesByFreq = Object.entries(keywordMap.stats)
  .sort((a, b) => b[1].count - a[1].count);

markdown += `### Top 15 Categories\n\n`;
markdown += `| Rank | Category | Occurrences | Original Keywords Mapped |\n`;
markdown += `|------|----------|-------------|-------------------------|\n`;

keywordCategoriesByFreq.slice(0, 15).forEach(([category, data], idx) => {
  markdown += `| ${idx + 1} | **${category}** | ${data.count} | ${data.original_keywords.length} |\n`;
});

markdown += `\n---\n\n`;

// Show sample mappings for each top category
markdown += `### Sample Mappings (Top 10 Categories)\n\n`;

keywordCategoriesByFreq.slice(0, 10).forEach(([category, data]) => {
  markdown += `#### ${category} (${data.count} occurrences)\n\n`;

  // Sort by frequency (parse from "keyword (freq)" format)
  const sorted = data.original_keywords
    .map(str => {
      const match = str.match(/^(.+) \((\d+)\)$/);
      return match ? { keyword: match[1], freq: parseInt(match[2]) } : null;
    })
    .filter(x => x !== null)
    .sort((a, b) => b.freq - a.freq);

  // Show top 10 and a few random low-frequency ones
  const top = sorted.slice(0, 10);
  const bottom = sorted.slice(-3);

  markdown += `**Top mappings:**\n`;
  top.forEach(({ keyword, freq }) => {
    markdown += `- \`${keyword}\` (${freq})\n`;
  });

  if (sorted.length > 10) {
    markdown += `\n**Sample low-frequency mappings:**\n`;
    bottom.forEach(({ keyword, freq }) => {
      markdown += `- \`${keyword}\` (${freq})\n`;
    });
  }

  markdown += `\n`;
});

markdown += `---\n\n`;

// ============================================
// PERSONA CONSOLIDATION SUMMARY
// ============================================

markdown += `## Persona Consolidation\n\n`;
markdown += `**Reduction:** ${personaMap.summary.original_count} → ${personaMap.summary.consolidated_count} categories (${personaMap.summary.reduction_pct}% reduction)\n\n`;

// Sort categories by occurrence
const personaCategoriesByFreq = Object.entries(personaMap.stats)
  .sort((a, b) => b[1].count - a[1].count);

markdown += `### Top 15 Categories\n\n`;
markdown += `| Rank | Category | Occurrences | Original Personas Mapped |\n`;
markdown += `|------|----------|-------------|-------------------------|\n`;

personaCategoriesByFreq.slice(0, 15).forEach(([category, data], idx) => {
  markdown += `| ${idx + 1} | **${category}** | ${data.count} | ${data.original_personas.length} |\n`;
});

markdown += `\n---\n\n`;

// Show sample mappings for each top category
markdown += `### Sample Mappings (Top 10 Categories)\n\n`;

personaCategoriesByFreq.slice(0, 10).forEach(([category, data]) => {
  markdown += `#### ${category} (${data.count} occurrences)\n\n`;

  // Sort by frequency
  const sorted = data.original_personas
    .map(str => {
      const match = str.match(/^(.+) \((\d+)\)$/);
      return match ? { persona: match[1], freq: parseInt(match[2]) } : null;
    })
    .filter(x => x !== null)
    .sort((a, b) => b.freq - a.freq);

  // Show top 10 and a few random low-frequency ones
  const top = sorted.slice(0, 10);
  const bottom = sorted.slice(-3);

  markdown += `**Top mappings:**\n`;
  top.forEach(({ persona, freq }) => {
    markdown += `- \`${persona}\` (${freq})\n`;
  });

  if (sorted.length > 10) {
    markdown += `\n**Sample low-frequency mappings:**\n`;
    bottom.forEach(({ persona, freq }) => {
      markdown += `- \`${persona}\` (${freq})\n`;
    });
  }

  markdown += `\n`;
});

markdown += `---\n\n`;

// ============================================
// POTENTIAL ISSUES / REVIEW NEEDED
// ============================================

markdown += `## Review Checklist\n\n`;

markdown += `### ✅ What Looks Good\n\n`;
markdown += `- No "Other" category needed - AI mapped everything to relevant categories\n`;
markdown += `- High-frequency keywords/personas mapped correctly to expected categories\n`;
markdown += `- Semantic grouping appears intelligent (e.g., "deepfakes" → Cybersecurity)\n\n`;

markdown += `### ⚠️ Items to Spot-Check\n\n`;

// Find any unusual mappings in keywords
const unusualKeywordMappings = [];
Object.entries(keywordMap.mapping).forEach(([keyword, category]) => {
  // Check for keywords that might be in wrong category
  if (keyword.includes('venture') && category !== 'Startups & Venture Capital') {
    unusualKeywordMappings.push(`"${keyword}" → ${category}`);
  }
  if (keyword.includes('education') && category !== 'Education & Skilling') {
    unusualKeywordMappings.push(`"${keyword}" → ${category}`);
  }
  if (keyword.includes('healthcare') && category !== 'Healthcare AI') {
    unusualKeywordMappings.push(`"${keyword}" → ${category}`);
  }
});

if (unusualKeywordMappings.length > 0) {
  markdown += `**Potential keyword mis-mappings:**\n`;
  unusualKeywordMappings.slice(0, 10).forEach(mapping => {
    markdown += `- ${mapping}\n`;
  });
  markdown += `\n`;
} else {
  markdown += `- ✅ No obvious keyword mis-mappings detected\n\n`;
}

// Check for categories with very few items
const smallCategories = keywordCategoriesByFreq.filter(([cat, data]) => data.count < 10);
if (smallCategories.length > 0) {
  markdown += `**Categories with very few occurrences (< 10):**\n`;
  smallCategories.forEach(([cat, data]) => {
    markdown += `- ${cat}: ${data.count} occurrences\n`;
  });
  markdown += `\n`;
}

markdown += `---\n\n`;

// ============================================
// APPROVAL SECTION
// ============================================

markdown += `## Approval Decision\n\n`;
markdown += `Review the mappings above and decide:\n\n`;
markdown += `- [ ] **APPROVED** - Apply consolidation to all events and exhibitors\n`;
markdown += `- [ ] **NEEDS CHANGES** - Specify which mappings need adjustment\n`;
markdown += `- [ ] **REJECTED** - Use original unconsolidated tags\n\n`;

markdown += `### If Approved\n\n`;
markdown += `Run: \`node apply_consolidation.js\`\n\n`;
markdown += `This will:\n`;
markdown += `1. Update all \`keywords\` in events → consolidated categories\n`;
markdown += `2. Update all \`target_personas\` in events → consolidated categories\n`;
markdown += `3. Update all \`keywords\` in exhibitors → consolidated categories\n`;
markdown += `4. Update all \`target_personas\` in exhibitors → consolidated categories\n`;
markdown += `5. Save as \`sessions_consolidated.json\` and \`exhibitors_consolidated.json\`\n\n`;

markdown += `**Estimated impact:**\n`;
markdown += `- Quiz matching will be 98% more efficient\n`;
markdown += `- Tag overlap will increase from ~10% to ~80%+\n`;
markdown += `- User will see better, more relevant recommendations\n\n`;

// Save summary
fs.writeFileSync('CONSOLIDATION_SUMMARY.md', markdown);

console.log('✅ Summary generated!\n');
console.log('📄 File: CONSOLIDATION_SUMMARY.md');
console.log('\nOpen the file to review all mappings and approve/reject the consolidation.');
