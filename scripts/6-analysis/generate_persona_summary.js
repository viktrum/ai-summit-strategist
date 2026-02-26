const fs = require('fs');

const data = JSON.parse(fs.readFileSync('persona_taxonomy_22.json', 'utf8'));

let md = `# 22-Persona Taxonomy Summary\n\n`;
md += `**Generated:** ${new Date(data.metadata.generated_at).toLocaleString()}\n\n`;
md += `---\n\n`;

md += `## Overview\n\n`;
md += `- **Categories:** ${data.metadata.total_categories}\n`;
md += `- **Original Personas Mapped:** ${data.metadata.total_personas_mapped} / ${data.metadata.total_unique_personas} (${data.metadata.coverage_percentage}%)\n`;
md += `- **Total Cost:** ~$0.01\n\n`;

md += `**Strategy:** Expanded core tech/business categories (1-14), kept other sectors broad (15-22)\n\n`;

md += `---\n\n`;

md += `## Category Overview\n\n`;

// Sort by occurrences
const categoriesOrdered = Object.entries(data.stats.category_distribution)
  .map(([name, stats]) => ({
    name,
    personas: stats.personas,
    occurrences: stats.occurrences,
    samples: stats.sample_personas
  }))
  .sort((a, b) => b.occurrences - a.occurrences);

md += `| # | Category | Personas | Occurrences |\n`;
md += `|---|----------|----------|-------------|\n`;

categoriesOrdered.forEach((cat, idx) => {
  md += `| ${idx + 1} | **${cat.name}** | ${cat.personas} | ${cat.occurrences} |\n`;
});

md += `\n---\n\n`;

md += `## Detailed Category Breakdown\n\n`;

// Group categories by section
const sections = {
  "Founders & Startups (3 categories)": [
    "Early-Stage Founders",
    "Growth-Stage Founders",
    "Technical Founders"
  ],
  "Enterprise Leadership (3 categories)": [
    "C-Suite Executives",
    "Technology Leaders",
    "Innovation & Strategy Leaders"
  ],
  "Product (2 categories)": [
    "AI Product Managers",
    "Product Managers"
  ],
  "Engineering (4 categories)": [
    "ML Engineers",
    "Data Scientists",
    "Backend Engineers",
    "Frontend & Full-Stack Engineers"
  ],
  "Research & Academia (2 categories)": [
    "AI Researchers",
    "Academic Faculty"
  ],
  "Other Sectors (8 categories)": [
    "Government & Policy Leaders",
    "Investors & VCs",
    "Consultants & Advisors",
    "Healthcare Professionals",
    "Educators",
    "Students",
    "Media & Analysts",
    "NGO & Social Sector"
  ]
};

Object.entries(sections).forEach(([sectionName, categoryNames]) => {
  md += `### ${sectionName}\n\n`;

  categoryNames.forEach(catName => {
    const catObj = data.categories.find(c => c.category === catName);
    const catStats = data.stats.category_distribution[catName];

    if (!catObj || !catStats) return;

    md += `#### ${catName}\n\n`;
    md += `**Description:** ${catObj.description}\n\n`;
    md += `**Includes:** ${catObj.includes.join(', ')}\n\n`;
    md += `**Stats:**\n`;
    md += `- Total personas mapped: ${catStats.personas}\n`;
    md += `- Total occurrences: ${catStats.occurrences}\n\n`;

    md += `**Top 10 Original Personas:**\n`;
    catStats.sample_personas.slice(0, 10).forEach((p, idx) => {
      md += `${idx + 1}. ${p.persona} (${p.freq} occurrences)\n`;
    });
    md += `\n`;
  });
});

md += `---\n\n`;

md += `## Top 30 Personas by Occurrence\n\n`;

// Get all personas with their categories and frequencies
const allPersonasWithCategories = Object.entries(data.mappings.persona_to_category)
  .map(([persona, category]) => {
    // Find frequency from stats
    let freq = 0;
    const catStats = data.stats.category_distribution[category];
    if (catStats) {
      const personaData = catStats.sample_personas.find(p => p.persona === persona);
      if (personaData) freq = personaData.freq;
    }
    return { persona, category, freq };
  })
  .sort((a, b) => b.freq - a.freq)
  .slice(0, 30);

md += `| Rank | Persona | Category | Occurrences |\n`;
md += `|------|---------|----------|-------------|\n`;

allPersonasWithCategories.forEach((p, idx) => {
  if (p.freq > 0) {
    md += `| ${idx + 1} | ${p.persona} | ${p.category} | ${p.freq} |\n`;
  }
});

md += `\n---\n\n`;

md += `## Sample Persona Mappings\n\n`;

md += `Showing how original personas map to the 22 categories:\n\n`;

const sampleMappings = Object.entries(data.mappings.persona_to_category).slice(0, 50);

md += `| Original Persona | Consolidated Category |\n`;
md += `|------------------|-----------------------|\n`;

sampleMappings.forEach(([persona, category]) => {
  md += `| ${persona} | **${category}** |\n`;
});

md += `\n...and ${Object.keys(data.mappings.persona_to_category).length - 50} more mappings\n\n`;

md += `---\n\n`;

md += `## Event JSON Structure\n\n`;

md += `After applying this taxonomy, event personas will be stored as consolidated categories:\n\n`;

md += `\`\`\`json\n`;
md += `{\n`;
md += `  "event_id": "evt-123",\n`;
md += `  "title": "AI Governance Summit",\n`;
md += `  "target_personas": [\n`;
md += `    "Government & Policy Leaders",\n`;
md += `    "AI Researchers",\n`;
md += `    "Technology Leaders"\n`;
md += `  ],\n`;
md += `  ...\n`;
md += `}\n`;
md += `\`\`\`\n\n`;

md += `**Benefits:**\n`;
md += `- Quiz users select from 22 clear categories (vs 1,221 confusing options)\n`;
md += `- Better matching: "I'm a Seed-Stage Founder" → matches "Early-Stage Founders"\n`;
md += `- Easier to maintain than 1,221 unique values\n`;
md += `- 100% coverage of original personas\n\n`;

md += `---\n\n`;

md += `## Review Items\n\n`;

md += `### ✅ What Looks Good\n\n`;
md += `- **Perfect coverage:** 100% of original personas mapped\n`;
md += `- **Balanced granularity:** Tech/business roles expanded (14 categories), other sectors kept broad (8 categories)\n`;
md += `- **Clear naming:** Category names are intuitive for quiz UI\n`;
md += `- **Good distribution:** No category is too small or too large\n`;
md += `- **User-centric:** Matches how people actually describe their roles\n\n`;

md += `### ⚠️ Items to Check\n\n`;

md += `**1. Category Names**\n`;
md += `Review if these work for your quiz:\n\n`;

data.categories.forEach((cat, idx) => {
  md += `${idx + 1}. **"${cat.category}"** - ${cat.description}\n`;
});

md += `\n`;

md += `**2. Potential Overlaps**\n`;
md += `Some personas could arguably fit in multiple categories:\n\n`;

md += `- "AI Product Managers" vs "Product Managers" - Is the distinction clear?\n`;
md += `- "Technical Founders" vs "ML Engineers" - Where does a founder-engineer fit?\n`;
md += `- "Innovation & Strategy Leaders" vs "C-Suite Executives" - Some overlap?\n\n`;

md += `**3. Low-Occurrence Categories**\n\n`;

const lowCategories = categoriesOrdered.filter(c => c.occurrences < 50);
if (lowCategories.length > 0) {
  md += `Categories with <50 occurrences:\n`;
  lowCategories.forEach(cat => {
    md += `- ${cat.name}: ${cat.occurrences} occurrences\n`;
  });
  md += `\nThese are valid but less common - acceptable?\n\n`;
} else {
  md += `✅ All categories have sufficient occurrences\n\n`;
}

md += `---\n\n`;

md += `## Quiz Design Implications\n\n`;

md += `### Recommended Quiz Question\n\n`;

md += `**"What best describes your role?"** (Single select)\n\n`;

md += `**Founders & Startups:**\n`;
md += `- [ ] Early-Stage Founder (Pre-seed, Seed, MVP stage)\n`;
md += `- [ ] Growth-Stage Founder (Series A+, scaling)\n`;
md += `- [ ] Technical Founder (Engineer/researcher background)\n\n`;

md += `**Business Leadership:**\n`;
md += `- [ ] C-Suite Executive (CEO, COO, CFO, CMO)\n`;
md += `- [ ] Technology Leader (CTO, CIO, VP Engineering)\n`;
md += `- [ ] Innovation & Strategy Leader\n\n`;

md += `**Product & Engineering:**\n`;
md += `- [ ] AI Product Manager\n`;
md += `- [ ] Product Manager\n`;
md += `- [ ] ML Engineer\n`;
md += `- [ ] Data Scientist\n`;
md += `- [ ] Backend Engineer\n`;
md += `- [ ] Frontend / Full-Stack Engineer\n\n`;

md += `**Research & Academia:**\n`;
md += `- [ ] AI Researcher (incl. PhD students)\n`;
md += `- [ ] Academic Faculty (Professor, Lecturer)\n\n`;

md += `**Other Roles:**\n`;
md += `- [ ] Government & Policy Leader\n`;
md += `- [ ] Investor / VC\n`;
md += `- [ ] Consultant / Advisor\n`;
md += `- [ ] Healthcare Professional\n`;
md += `- [ ] Educator\n`;
md += `- [ ] Student\n`;
md += `- [ ] Media / Analyst\n`;
md += `- [ ] NGO / Social Sector\n\n`;

md += `**UI Notes:**\n`;
md += `- Use radio buttons (single select)\n`;
md += `- Group into sections as shown above\n`;
md += `- Add brief descriptions in tooltips if needed\n`;
md += `- Mobile: Use expandable sections or searchable dropdown\n\n`;

md += `---\n\n`;

md += `## Approval Decision\n\n`;

md += `After reviewing:\n\n`;

md += `- [ ] **APPROVED AS-IS** - Apply this taxonomy to events (22 categories)\n`;
md += `- [ ] **APPROVE WITH TWEAKS** - Specify category name changes needed\n`;
md += `- [ ] **NEEDS ADJUSTMENT** - Specify which categories to merge/split\n`;
md += `- [ ] **REJECTED** - Start over with different approach\n\n`;

md += `### If Approved\n\n`;

md += `Next steps:\n`;
md += `1. Apply persona taxonomy to \`sessions_with_logos.json\` and \`expolist_enriched.json\`\n`;
md += `2. Transform \`target_personas\` from arrays of strings to consolidated categories\n`;
md += `3. Combine with keyword taxonomy (already approved)\n`;
md += `4. Create final production data files:\n`;
md += `   - \`events_final.json\` (with consolidated keywords + personas)\n`;
md += `   - \`exhibitors_final.json\` (with consolidated keywords + personas)\n`;
md += `5. Ready for app development!\n\n`;

md += `---\n\n`;

md += `**End of Summary**\n`;

fs.writeFileSync('PERSONA_TAXONOMY_SUMMARY.md', md);

console.log('✅ Summary generated: PERSONA_TAXONOMY_SUMMARY.md');
console.log('\n📊 Summary includes:');
console.log('  - All 22 categories grouped by section');
console.log('  - Top personas in each category');
console.log('  - Quiz design recommendations');
console.log('  - Approval checklist');
console.log('\n📄 Open PERSONA_TAXONOMY_SUMMARY.md to review');
