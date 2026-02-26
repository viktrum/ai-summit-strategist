# Proposed Folder Structure

## Current Problem
- 30+ files in root directory
- Mix of scripts, data, outputs, docs
- Hard to find production vs development files
- No clear separation of concerns

## Proposed Structure

```
/AI Summit/
├── README.md                          # Project overview
├── CLAUDE.md                          # Claude context (keep in root)
├── .env                               # Environment variables (keep in root)
├── package.json                       # Dependencies (keep in root)
├── node_modules/                      # Dependencies (keep in root)
│
├── data/                              # 📂 All data files
│   ├── raw/                           # Original scraped data
│   │   ├── sessions.json              # 480 events (original scrape)
│   │   ├── sessions.csv               # CSV export
│   │   ├── expolist.json              # 715 exhibitors (raw)
│   │   └── Expo List.html             # Original HTML source
│   │
│   ├── enriched/                      # AI-enriched data (intermediate)
│   │   ├── sessions_enriched.json     # First enrichment attempt
│   │   ├── sessions_enriched_v2.json  # Final enrichment (463 events)
│   │   ├── sessions_with_logos.json   # With logo URLs added
│   │   ├── expolist_enriched.json     # Enriched exhibitors
│   │   └── backups/                   # Old versions
│   │       ├── sessions_enriched_backup.json
│   │       └── sessions_enriched_backup_20260212_165401.json
│   │
│   ├── taxonomies/                    # Consolidation mappings
│   │   ├── keyword_taxonomy_100.json  # 137 keywords, 12 categories
│   │   ├── persona_taxonomy_22.json   # 22 persona categories
│   │   ├── vocabulary.json            # Original vocabulary analysis
│   │   └── archive/                   # Old attempts
│   │       ├── keyword_consolidation_map.json (old 25-keyword attempt)
│   │       └── persona_consolidation_map.json (old 25-persona attempt)
│   │
│   └── production/                    # 🚀 FINAL FILES FOR APP
│       ├── events.json                # 463 events (production-ready)
│       ├── exhibitors.json            # 715 exhibitors (production-ready)
│       └── metadata.json              # Data statistics
│
├── scripts/                           # 🔧 All scripts
│   ├── 1-scraping/                    # Data collection
│   │   ├── fetch_sessions.py          # Original scraper
│   │   └── parse_expo.js              # Extract exhibitors from HTML
│   │
│   ├── 2-enrichment/                  # AI enrichment
│   │   ├── enrich_v2.js               # Main enrichment script
│   │   ├── enrich_fix49.js            # Fix null event_ids
│   │   └── match_logos.js             # Match exhibitor logos to events
│   │
│   ├── 3-deduplication/               # Data cleaning
│   │   ├── dedupe_sessions.py         # Remove duplicate events
│   │   ├── dedupe_dryrun.py           # Dry run (analysis only)
│   │   └── dedupe_final.py            # Final deduplication
│   │
│   ├── 4-consolidation/               # Taxonomy building
│   │   ├── build_vocabulary.js        # Extract unique keywords/personas
│   │   ├── build_100_keywords_v2.js   # Build keyword taxonomy (2-pass)
│   │   ├── build_10_personas.js       # Build persona taxonomy (22 categories)
│   │   └── archive/
│   │       ├── build_100_keywords.js  # Old single-pass attempt
│   │       ├── build_consolidation_maps.js
│   │       ├── ai_consolidate.js
│   │       └── build_keyword_hierarchy.js
│   │
│   ├── 5-transformation/              # Apply taxonomies
│   │   └── apply_taxonomies.js        # Transform events with taxonomies
│   │
│   └── 6-analysis/                    # Generate summaries
│       ├── generate_keyword_summary.js
│       ├── generate_persona_summary.js
│       └── generate_hierarchy_summary.js
│
├── docs/                              # 📄 Documentation
│   ├── summaries/                     # Review documents
│   │   ├── KEYWORD_TAXONOMY_SUMMARY.md
│   │   ├── PERSONA_TAXONOMY_SUMMARY.md
│   │   ├── CONSOLIDATION_SUMMARY.md
│   │   └── SESSION_HANDOVER.md
│   │
│   ├── plans/                         # Planning documents
│   │   ├── FINAL_PLAN.md              # Current plan (source of truth)
│   │   ├── plan.md                    # Original plan
│   │   ├── plan_v2.md                 # Updated plan
│   │   └── HEAVY_HITTER_UPDATE.md
│   │
│   └── notes/                         # Session notes
│       ├── SESSION_SUMMARY.md
│       ├── Gemini Conversation till now.txt
│       └── Prompt.txt
│
└── logs/                              # 📝 Execution logs
    ├── consolidation_output.log
    ├── keyword_100_output.log
    ├── keyword_100_v2_output.log
    └── keyword_hierarchy_output.log
```

## Benefits

1. **Clear separation**: Raw → Enriched → Taxonomies → Production
2. **Easy to find**: Need production files? `data/production/`
3. **Safe to delete**: `logs/` and `archive/` folders can be cleaned up
4. **Version control ready**: `.gitignore` can exclude `data/raw/`, `logs/`, etc.
5. **Onboarding friendly**: New developers can understand structure instantly

## What to Keep in Root

Only essentials:
- `CLAUDE.md` (Claude needs it in root)
- `package.json`, `package-lock.json`, `node_modules/`
- `.env`
- `README.md`

## Migration Script

Would you like me to create a script to automatically reorganize everything?

## Next Steps

1. Review this structure
2. Approve or suggest changes
3. I'll create the folders and move files automatically
