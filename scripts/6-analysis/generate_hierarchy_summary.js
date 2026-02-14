const fs = require('fs');

const data = JSON.parse(fs.readFileSync('keyword_hierarchy.json', 'utf8'));

let md = `# Keyword Hierarchy Summary\n\n`;
md += `**Generated:** ${new Date(data.metadata.generated_at).toLocaleString()}\n\n`;
md += `---\n\n`;

md += `## Overview\n\n`;
md += `- **Categories:** ${data.metadata.total_categories}\n`;
md += `- **Subcategories:** ${data.metadata.total_subcategories} ⚠️ (Target was ~100)\n`;
md += `- **Keywords Mapped:** ${data.metadata.total_keywords}\n\n`;

md += `---\n\n`;

md += `## Top-Level Categories\n\n`;

const categoriesOrdered = Object.entries(data.stats.categories)
  .sort((a, b) => b[1].occurrences - a[1].occurrences);

md += `| Rank | Category | Subcategories | Keywords | Occurrences |\n`;
md += `|------|----------|---------------|----------|-------------|\n`;

categoriesOrdered.forEach(([cat, stats], idx) => {
  md += `| ${idx + 1} | **${cat}** | ${stats.subcategories} | ${stats.keywords} | ${stats.occurrences} |\n`;
});

md += `\n---\n\n`;

md += `## Detailed Category Breakdown\n\n`;

categoriesOrdered.forEach(([category, categoryStats]) => {
  md += `### ${category}\n\n`;
  md += `- **Total Subcategories:** ${categoryStats.subcategories}\n`;
  md += `- **Total Keywords:** ${categoryStats.keywords}\n`;
  md += `- **Total Occurrences:** ${categoryStats.occurrences}\n\n`;

  // Show top 15 subcategories by occurrence
  const subcatsOrdered = Object.entries(categoryStats.subcategory_details)
    .sort((a, b) => b[1].occurrences - a[1].occurrences);

  md += `#### Top 15 Subcategories\n\n`;
  md += `| Subcategory | Keywords | Occurrences | Top 3 Keywords |\n`;
  md += `|-------------|----------|-------------|----------------|\n`;

  subcatsOrdered.slice(0, 15).forEach(([subcat, substats]) => {
    const top3 = substats.top_keywords.slice(0, 3).join(', ');
    md += `| ${subcat} | ${substats.keywords} | ${substats.occurrences} | ${top3} |\n`;
  });

  md += `\n`;

  // Show duplicate/similar subcategories if any
  const subcatNames = Object.keys(categoryStats.subcategory_details);
  const similarPairs = [];

  for (let i = 0; i < subcatNames.length; i++) {
    for (let j = i + 1; j < subcatNames.length; j++) {
      const name1 = subcatNames[i].toLowerCase();
      const name2 = subcatNames[j].toLowerCase();

      // Check for similar names
      if (name1.includes(name2) || name2.includes(name1)) {
        similarPairs.push([subcatNames[i], subcatNames[j]]);
      }
    }
  }

  if (similarPairs.length > 0) {
    md += `#### ⚠️ Potential Duplicates/Overlaps (${similarPairs.length} pairs)\n\n`;
    similarPairs.slice(0, 10).forEach(([sub1, sub2]) => {
      const stats1 = categoryStats.subcategory_details[sub1];
      const stats2 = categoryStats.subcategory_details[sub2];
      md += `- "${sub1}" (${stats1.occurrences}) vs "${sub2}" (${stats2.occurrences})\n`;
    });
    if (similarPairs.length > 10) {
      md += `- ...and ${similarPairs.length - 10} more\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;
});

md += `## Issues & Recommendations\n\n`;

md += `### ⚠️ Too Many Subcategories\n\n`;
md += `**Current:** ${data.metadata.total_subcategories} subcategories\n`;
md += `**Target:** ~100 subcategories\n`;
md += `**Overage:** ${data.metadata.total_subcategories - 100} extra (${((data.metadata.total_subcategories / 100 - 1) * 100).toFixed(0)}% over target)\n\n`;

md += `**Problem:** Many subcategories are overlapping or could be merged.\n\n`;

md += `**Solutions:**\n`;
md += `1. **Re-run with stricter consolidation** - Force AI to create max 8-12 subcategories per category\n`;
md += `2. **Manual merge** - Review duplicates listed above and merge similar ones\n`;
md += `3. **Accept higher count** - Keep ~600 subcategories if granularity is valuable\n\n`;

md += `### Suggested Next Steps\n\n`;
md += `- [ ] **Option A:** Re-run hierarchy builder with max subcategory limit (8-12 per category = ~100 total)\n`;
md += `- [ ] **Option B:** Manually consolidate duplicates and accept ~200-300 subcategories\n`;
md += `- [ ] **Option C:** Accept current 623 subcategories (more granular matching)\n\n`;

md += `---\n\n`;

md += `## Approval Checklist\n\n`;
md += `**After reviewing:**\n\n`;
md += `- [ ] **APPROVED AS-IS** - Proceed with 623 subcategories\n`;
md += `- [ ] **RE-RUN WITH LIMITS** - Specify max subcategories per category\n`;
md += `- [ ] **NEEDS MANUAL FIXES** - Specify which subcategories to merge\n\n`;

fs.writeFileSync('KEYWORD_HIERARCHY_SUMMARY.md', md);

console.log('✅ Summary generated: KEYWORD_HIERARCHY_SUMMARY.md');
console.log('📊 Review the file for detailed breakdown and duplicates analysis');
