const fs = require('fs');

const data = JSON.parse(fs.readFileSync('keyword_taxonomy_100.json', 'utf8'));

let md = `# 100-Keyword Taxonomy Summary\n\n`;
md += `**Generated:** ${new Date(data.metadata.generated_at).toLocaleString()}\n\n`;
md += `---\n\n`;

md += `## Overview\n\n`;
md += `- **Categories:** ${data.metadata.total_categories}\n`;
md += `- **Consolidated Keywords:** ${data.metadata.total_keywords}\n`;
md += `- **Original Keywords Mapped:** ${data.metadata.total_original_keywords} / 1,624 (${data.metadata.coverage_percentage}%)\n`;
md += `- **Total Cost:** ~$0.015\n\n`;

md += `**Note:** Target was 100 keywords, achieved ${data.metadata.total_keywords} keywords. This is ${data.metadata.total_keywords - 100} over target but provides better coverage.\n\n`;

md += `---\n\n`;

md += `## Category Overview\n\n`;

const categoryStats = {};
data.categories.forEach(cat => {
  categoryStats[cat.name] = {
    description: cat.description,
    keywords: data.keywords.filter(k => k.category === cat.name),
    count: data.stats.category_distribution[cat.name] || 0
  };
});

md += `| # | Category | Keywords | Total Occurrences |\n`;
md += `|---|----------|----------|-------------------|\n`;

const categoriesOrdered = data.categories
  .map(cat => ({
    name: cat.name,
    count: categoryStats[cat.name].count,
    occurrences: categoryStats[cat.name].keywords.reduce((sum, k) => sum + k.total_occurrences, 0)
  }))
  .sort((a, b) => b.occurrences - a.occurrences);

categoriesOrdered.forEach((cat, idx) => {
  md += `| ${idx + 1} | **${cat.name}** | ${cat.count} | ${cat.occurrences} |\n`;
});

md += `\n---\n\n`;

md += `## Detailed Category Breakdown\n\n`;

categoriesOrdered.forEach(catInfo => {
  const catData = categoryStats[catInfo.name];
  const catObj = data.categories.find(c => c.name === catInfo.name);

  md += `### ${catInfo.name}\n\n`;
  md += `**Description:** ${catObj.description}\n\n`;
  md += `**Keywords in this category:** ${catData.count}\n`;
  md += `**Total occurrences:** ${catInfo.occurrences}\n\n`;

  // Sort keywords by occurrence
  const sortedKeywords = catData.keywords.sort((a, b) => b.total_occurrences - a.total_occurrences);

  md += `| # | Keyword | Occurrences | Merged From (Top 5) |\n`;
  md += `|---|---------|-------------|---------------------|\n`;

  sortedKeywords.forEach((kw, idx) => {
    const mergedFrom = kw.original_keywords.slice(0, 5).join(', ');
    const extra = kw.original_keywords.length > 5 ? ` +${kw.original_keywords.length - 5} more` : '';
    md += `| ${idx + 1} | **${kw.keyword}** | ${kw.total_occurrences} | ${mergedFrom}${extra} |\n`;
  });

  md += `\n`;
});

md += `---\n\n`;

md += `## Top 30 Keywords by Occurrence\n\n`;

const topKeywords = data.keywords
  .sort((a, b) => b.total_occurrences - a.total_occurrences)
  .slice(0, 30);

md += `| Rank | Keyword | Category | Occurrences |\n`;
md += `|------|---------|----------|-------------|\n`;

topKeywords.forEach((kw, idx) => {
  md += `| ${idx + 1} | **${kw.keyword}** | ${kw.category} | ${kw.total_occurrences} |\n`;
});

md += `\n---\n\n`;

md += `## Sample Original → Consolidated Mappings\n\n`;

md += `Showing how original keywords map to the 137 consolidated keywords:\n\n`;

const sampleMappings = Object.entries(data.mappings.original_to_consolidated)
  .slice(0, 50);

md += `| Original Keyword | Consolidated Keyword |\n`;
md += `|------------------|----------------------|\n`;

sampleMappings.forEach(([original, consolidated]) => {
  md += `| ${original} | **${consolidated}** |\n`;
});

md += `\n...and ${Object.keys(data.mappings.original_to_consolidated).length - 50} more mappings\n\n`;

md += `---\n\n`;

md += `## Event JSON Structure\n\n`;

md += `After applying this taxonomy, event keywords will be transformed to:\n\n`;

md += `\`\`\`json\n`;
md += `{\n`;
md += `  "event_id": "evt-123",\n`;
md += `  "title": "AI Governance Summit",\n`;
md += `  "keywords": [\n`;
md += `    {"category": "AI Governance & Ethics", "keyword": "Responsible AI"},\n`;
md += `    {"category": "Regulatory & Legal Frameworks", "keyword": "AI Policy"},\n`;
md += `    {"category": "Social Impact & Inclusion", "keyword": "Digital Inclusion"}\n`;
md += `  ],\n`;
md += `  ...\n`;
md += `}\n`;
md += `\`\`\`\n\n`;

md += `**Benefits:**\n`;
md += `- Quiz/LinkedIn can match on **category** (broad match) or **keyword** (exact match)\n`;
md += `- Scoring: Category match = 5 points, Keyword match = 10 points\n`;
md += `- Easier to maintain than 1,624 unique values\n`;
md += `- 98.3% coverage of original keywords\n\n`;

md += `---\n\n`;

md += `## Review Items\n\n`;

md += `### ✅ What Looks Good\n\n`;
md += `- **High coverage:** 98.3% of original keywords mapped\n`;
md += `- **Balanced categories:** Most categories have 6-21 keywords\n`;
md += `- **Clear MECE structure:** Categories are mutually exclusive\n`;
md += `- **Preserved high-frequency keywords:** Top keywords retained\n`;
md += `- **Good semantic grouping:** Similar concepts consolidated logically\n\n`;

md += `### ⚠️ Items to Check\n\n`;

md += `**1. Keyword Count**\n`;
md += `- Target: 100 keywords\n`;
md += `- Actual: ${data.metadata.total_keywords} keywords\n`;
md += `- Over by: ${data.metadata.total_keywords - 100}\n`;
md += `- **Decision:** Accept ${data.metadata.total_keywords} or re-run to force exactly 100?\n\n`;

md += `**2. Category Names**\n`;
md += `Review category names for clarity:\n`;
data.categories.forEach((cat, idx) => {
  md += `${idx + 1}. "${cat.name}" - Does this name work for your quiz/UI?\n`;
});
md += `\n`;

md += `**3. Sample Controversial Mappings**\n`;
md += `Review if these make sense:\n`;

// Find some potentially questionable mappings
const samples = [
  { original: 'cloud computing', check: 'Data & Infrastructure' },
  { original: 'fintech', check: 'Industry Applications' },
  { original: 'ai safety', check: 'AI Governance & Ethics' }
];

samples.forEach(s => {
  const consolidated = data.mappings.original_to_consolidated[s.original];
  const kw = data.keywords.find(k => k.keyword === consolidated);
  if (kw) {
    md += `- "${s.original}" → **${consolidated}** (${kw.category})\n`;
  }
});

md += `\n`;

md += `---\n\n`;

md += `## Approval Decision\n\n`;

md += `After reviewing:\n\n`;

md += `- [ ] **APPROVED AS-IS** - Apply this taxonomy to events (${data.metadata.total_keywords} keywords, 12 categories)\n`;
md += `- [ ] **APPROVE WITH TWEAKS** - Specify keyword/category name changes needed\n`;
md += `- [ ] **RE-RUN** - Force exactly 100 keywords (will require more aggressive consolidation)\n`;
md += `- [ ] **REJECTED** - Start over with different approach\n\n`;

md += `### If Approved\n\n`;

md += `Next steps:\n`;
md += `1. Apply taxonomy to \`sessions_with_logos.json\` and \`expolist_enriched.json\`\n`;
md += `2. Transform keywords from arrays to \`[{category, keyword}]\` format\n`;
md += `3. Save as new files for production use\n`;
md += `4. Proceed to persona consolidation (10 categories)\n\n`;

md += `---\n\n`;

md += `**End of Summary**\n`;

fs.writeFileSync('KEYWORD_TAXONOMY_SUMMARY.md', md);

console.log('✅ Summary generated: KEYWORD_TAXONOMY_SUMMARY.md');
console.log('\n📊 Summary includes:');
console.log('  - Full category breakdown with all keywords');
console.log('  - Top 30 keywords by occurrence');
console.log('  - Sample original → consolidated mappings');
console.log('  - Review checklist and approval section');
console.log('\n📄 Open KEYWORD_TAXONOMY_SUMMARY.md to review');
