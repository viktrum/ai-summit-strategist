const fs = require('fs');

console.log('🔄 Applying taxonomies to events and exhibitors...\n');

// Load data
const events = JSON.parse(fs.readFileSync('sessions_with_logos.json', 'utf8'));
const exhibitors = JSON.parse(fs.readFileSync('expolist_enriched.json', 'utf8'));

// Load taxonomies
const keywordTaxonomy = JSON.parse(fs.readFileSync('keyword_taxonomy_100.json', 'utf8'));
const personaTaxonomy = JSON.parse(fs.readFileSync('persona_taxonomy_22.json', 'utf8'));

console.log(`Loaded ${events.length} events`);
console.log(`Loaded ${exhibitors.length} exhibitors`);
console.log(`Loaded keyword taxonomy: ${keywordTaxonomy.metadata.total_keywords} keywords, ${keywordTaxonomy.metadata.total_categories} categories`);
console.log(`Loaded persona taxonomy: ${personaTaxonomy.metadata.total_categories} categories\n`);

// Get mappings
const originalToConsolidatedKeyword = keywordTaxonomy.mappings.original_to_consolidated;
const keywordToCategory = keywordTaxonomy.mappings.keyword_to_category;
const personaToCategory = personaTaxonomy.mappings.persona_to_category;

// Stats tracking
const stats = {
  events: {
    total: events.length,
    keywords_transformed: 0,
    personas_transformed: 0,
    keywords_unmapped: 0,
    personas_unmapped: 0
  },
  exhibitors: {
    total: exhibitors.length,
    keywords_transformed: 0,
    personas_transformed: 0,
    keywords_unmapped: 0,
    personas_unmapped: 0
  }
};

// Transform keywords array to {category, keyword} format
function transformKeywords(keywordsArray, statsObj) {
  if (!Array.isArray(keywordsArray)) return [];

  const transformed = [];
  const seen = new Set(); // Deduplicate consolidated keywords

  keywordsArray.forEach(originalKeyword => {
    const normalized = originalKeyword.toLowerCase().trim();
    const consolidatedKeyword = originalToConsolidatedKeyword[normalized];

    if (consolidatedKeyword) {
      // Skip if we already added this consolidated keyword
      if (seen.has(consolidatedKeyword)) return;

      const category = keywordToCategory[consolidatedKeyword];

      if (category) {
        transformed.push({
          category: category,
          keyword: consolidatedKeyword
        });
        seen.add(consolidatedKeyword);
        statsObj.keywords_transformed++;
      } else {
        console.log(`  ⚠️  Keyword "${consolidatedKeyword}" has no category mapping`);
        statsObj.keywords_unmapped++;
      }
    } else {
      // Unmapped keyword
      statsObj.keywords_unmapped++;
    }
  });

  return transformed;
}

// Transform personas array to consolidated categories
function transformPersonas(personasArray, statsObj) {
  if (!Array.isArray(personasArray)) return [];

  const categories = new Set(); // Deduplicate categories

  personasArray.forEach(originalPersona => {
    const normalized = originalPersona.trim();
    const category = personaToCategory[normalized];

    if (category) {
      categories.add(category);
      statsObj.personas_transformed++;
    } else {
      // Unmapped persona
      statsObj.personas_unmapped++;
    }
  });

  return Array.from(categories).sort();
}

// Transform events
console.log('🔄 Transforming events...\n');
const eventsTransformed = events.map((event, idx) => {
  if (idx % 100 === 0) {
    console.log(`  Processing event ${idx + 1}/${events.length}...`);
  }

  return {
    ...event,
    keywords: transformKeywords(event.keywords || [], stats.events),
    target_personas: transformPersonas(event.target_personas || [], stats.events)
  };
});

console.log('\n✓ Events transformed\n');

// Transform exhibitors
console.log('🔄 Transforming exhibitors...\n');
const exhibitorsTransformed = exhibitors.map((exhibitor, idx) => {
  if (idx % 100 === 0) {
    console.log(`  Processing exhibitor ${idx + 1}/${exhibitors.length}...`);
  }

  return {
    ...exhibitor,
    keywords: transformKeywords(exhibitor.keywords || [], stats.exhibitors),
    target_personas: transformPersonas(exhibitor.target_personas || [], stats.exhibitors)
  };
});

console.log('\n✓ Exhibitors transformed\n');

// Print statistics
console.log('=== TRANSFORMATION STATISTICS ===\n');

console.log('EVENTS:');
console.log(`  Total events: ${stats.events.total}`);
console.log(`  Keywords transformed: ${stats.events.keywords_transformed}`);
console.log(`  Keywords unmapped: ${stats.events.keywords_unmapped}`);
console.log(`  Personas transformed: ${stats.events.personas_transformed}`);
console.log(`  Personas unmapped: ${stats.events.personas_unmapped}`);

// Calculate average keywords and personas per event
const avgKeywordsPerEvent = eventsTransformed.reduce((sum, e) => sum + e.keywords.length, 0) / eventsTransformed.length;
const avgPersonasPerEvent = eventsTransformed.reduce((sum, e) => sum + e.target_personas.length, 0) / eventsTransformed.length;

console.log(`  Avg keywords per event: ${avgKeywordsPerEvent.toFixed(1)}`);
console.log(`  Avg personas per event: ${avgPersonasPerEvent.toFixed(1)}\n`);

console.log('EXHIBITORS:');
console.log(`  Total exhibitors: ${stats.exhibitors.total}`);
console.log(`  Keywords transformed: ${stats.exhibitors.keywords_transformed}`);
console.log(`  Keywords unmapped: ${stats.exhibitors.keywords_unmapped}`);
console.log(`  Personas transformed: ${stats.exhibitors.personas_transformed}`);
console.log(`  Personas unmapped: ${stats.exhibitors.personas_unmapped}`);

const avgKeywordsPerExhibitor = exhibitorsTransformed.reduce((sum, e) => sum + e.keywords.length, 0) / exhibitorsTransformed.length;
const avgPersonasPerExhibitor = exhibitorsTransformed.reduce((sum, e) => sum + e.target_personas.length, 0) / exhibitorsTransformed.length;

console.log(`  Avg keywords per exhibitor: ${avgKeywordsPerExhibitor.toFixed(1)}`);
console.log(`  Avg personas per exhibitor: ${avgPersonasPerExhibitor.toFixed(1)}\n`);

// Show sample transformed event
console.log('=== SAMPLE TRANSFORMED EVENT ===\n');
const sampleEvent = eventsTransformed[0];
console.log(`Title: ${sampleEvent.title}`);
console.log(`\nKeywords (${sampleEvent.keywords.length}):`);
sampleEvent.keywords.forEach(kw => {
  console.log(`  - ${kw.category} → ${kw.keyword}`);
});
console.log(`\nTarget Personas (${sampleEvent.target_personas.length}):`);
sampleEvent.target_personas.forEach(p => {
  console.log(`  - ${p}`);
});

// Show sample transformed exhibitor
console.log('\n=== SAMPLE TRANSFORMED EXHIBITOR ===\n');
const sampleExhibitor = exhibitorsTransformed[0];
console.log(`Name: ${sampleExhibitor.name}`);
console.log(`\nKeywords (${sampleExhibitor.keywords.length}):`);
sampleExhibitor.keywords.forEach(kw => {
  console.log(`  - ${kw.category} → ${kw.keyword}`);
});
console.log(`\nTarget Personas (${sampleExhibitor.target_personas.length}):`);
sampleExhibitor.target_personas.forEach(p => {
  console.log(`  - ${p}`);
});

// Save transformed data
console.log('\n📝 Saving transformed data...\n');

fs.writeFileSync(
  'events_final.json',
  JSON.stringify(eventsTransformed, null, 2)
);

fs.writeFileSync(
  'exhibitors_final.json',
  JSON.stringify(exhibitorsTransformed, null, 2)
);

// Also create a metadata file
const metadata = {
  generated_at: new Date().toISOString(),
  taxonomies: {
    keywords: {
      categories: keywordTaxonomy.metadata.total_categories,
      consolidated_keywords: keywordTaxonomy.metadata.total_keywords,
      original_keywords: keywordTaxonomy.metadata.total_original_keywords,
      coverage: keywordTaxonomy.metadata.coverage_percentage
    },
    personas: {
      categories: personaTaxonomy.metadata.total_categories,
      original_personas: personaTaxonomy.metadata.total_unique_personas,
      coverage: personaTaxonomy.metadata.coverage_percentage
    }
  },
  data: {
    events: {
      total: stats.events.total,
      avg_keywords_per_event: avgKeywordsPerEvent.toFixed(1),
      avg_personas_per_event: avgPersonasPerEvent.toFixed(1)
    },
    exhibitors: {
      total: stats.exhibitors.total,
      avg_keywords_per_exhibitor: avgKeywordsPerExhibitor.toFixed(1),
      avg_personas_per_exhibitor: avgPersonasPerExhibitor.toFixed(1)
    }
  },
  stats: stats
};

fs.writeFileSync('final_data_metadata.json', JSON.stringify(metadata, null, 2));

console.log('✅ TRANSFORMATION COMPLETE!\n');
console.log('Files created:');
console.log('  - events_final.json (463 events with transformed keywords + personas)');
console.log('  - exhibitors_final.json (715 exhibitors with transformed keywords + personas)');
console.log('  - final_data_metadata.json (transformation statistics)\n');

console.log('🚀 Ready for production use!');
