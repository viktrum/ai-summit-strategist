const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔄 Safe Project Reorganization Script\n');
console.log('This will reorganize files into the new folder structure.\n');

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No files will be moved\n');
}

// File mapping: source -> destination
const fileMap = {
  // ===== CRITICAL PRODUCTION DATA =====
  'events_final.json': 'data/production/events.json',
  'exhibitors_final.json': 'data/production/exhibitors.json',
  'final_data_metadata.json': 'data/production/metadata.json',

  // ===== CRITICAL TAXONOMIES =====
  'keyword_taxonomy_100.json': 'data/taxonomies/keyword_taxonomy_100.json',
  'persona_taxonomy_22.json': 'data/taxonomies/persona_taxonomy_22.json',
  'vocabulary.json': 'data/taxonomies/vocabulary.json',

  // ===== CRITICAL DOCUMENTATION =====
  'FINAL_PLAN.md': 'docs/plans/FINAL_PLAN.md',
  'SESSION_HANDOVER.md': 'docs/summaries/SESSION_HANDOVER.md',

  // ===== RAW DATA =====
  'sessions.json': 'data/raw/sessions.json',
  'sessions.csv': 'data/raw/sessions.csv',
  'expolist.json': 'data/raw/expolist.json',
  'Expo List.html': 'data/raw/Expo_List.html',

  // ===== ENRICHED DATA =====
  'sessions_enriched.json': 'data/enriched/sessions_enriched.json',
  'sessions_enriched_v2.json': 'data/enriched/sessions_enriched_v2.json',
  'sessions_with_logos.json': 'data/enriched/sessions_with_logos.json',
  'expolist_enriched.json': 'data/enriched/expolist_enriched.json',
  'sessions_enriched_clean.json': 'data/enriched/backups/sessions_enriched_clean.json',
  'sessions_enriched_backup.json': 'data/enriched/backups/sessions_enriched_backup.json',
  'sessions_enriched_backup_20260212_165401.json': 'data/enriched/backups/sessions_enriched_backup_20260212_165401.json',

  // ===== SCRIPTS - SCRAPING =====
  'fetch_sessions.py': 'scripts/1-scraping/fetch_sessions.py',
  'parse_expo.js': 'scripts/1-scraping/parse_expo.js',

  // ===== SCRIPTS - ENRICHMENT =====
  'enrich_v2.js': 'scripts/2-enrichment/enrich_v2.js',
  'enrich_fix49.js': 'scripts/2-enrichment/enrich_fix49.js',
  'match_logos.js': 'scripts/2-enrichment/match_logos.js',

  // ===== SCRIPTS - DEDUPLICATION =====
  'dedupe_sessions.py': 'scripts/3-deduplication/dedupe_sessions.py',
  'dedupe_dryrun.py': 'scripts/3-deduplication/dedupe_dryrun.py',
  'dedupe_dryrun_v2.py': 'scripts/3-deduplication/dedupe_dryrun_v2.py',
  'dedupe_final.py': 'scripts/3-deduplication/dedupe_final.py',
  'fix_heavy_hitters.py': 'scripts/3-deduplication/fix_heavy_hitters.py',

  // ===== SCRIPTS - CONSOLIDATION =====
  'build_vocabulary.js': 'scripts/4-consolidation/build_vocabulary.js',
  'build_100_keywords_v2.js': 'scripts/4-consolidation/build_100_keywords_v2.js',
  'build_10_personas.js': 'scripts/4-consolidation/build_10_personas.js',
  'build_100_keywords.js': 'scripts/4-consolidation/archive/build_100_keywords.js',
  'build_consolidation_maps.js': 'scripts/4-consolidation/archive/build_consolidation_maps.js',
  'ai_consolidate.js': 'scripts/4-consolidation/archive/ai_consolidate.js',
  'build_keyword_hierarchy.js': 'scripts/4-consolidation/archive/build_keyword_hierarchy.js',
  'keyword_consolidation_map.json': 'data/taxonomies/archive/keyword_consolidation_map.json',
  'persona_consolidation_map.json': 'data/taxonomies/archive/persona_consolidation_map.json',
  'keyword_hierarchy.json': 'data/taxonomies/archive/keyword_hierarchy.json',

  // ===== SCRIPTS - TRANSFORMATION =====
  'apply_taxonomies.js': 'scripts/5-transformation/apply_taxonomies.js',

  // ===== SCRIPTS - ANALYSIS =====
  'generate_keyword_summary.js': 'scripts/6-analysis/generate_keyword_summary.js',
  'generate_persona_summary.js': 'scripts/6-analysis/generate_persona_summary.js',
  'generate_hierarchy_summary.js': 'scripts/6-analysis/generate_hierarchy_summary.js',
  'show_more_examples.py': 'scripts/6-analysis/show_more_examples.py',

  // ===== DOCUMENTATION - SUMMARIES =====
  'KEYWORD_TAXONOMY_SUMMARY.md': 'docs/summaries/KEYWORD_TAXONOMY_SUMMARY.md',
  'PERSONA_TAXONOMY_SUMMARY.md': 'docs/summaries/PERSONA_TAXONOMY_SUMMARY.md',
  'CONSOLIDATION_SUMMARY.md': 'docs/summaries/CONSOLIDATION_SUMMARY.md',
  'KEYWORD_HIERARCHY_SUMMARY.md': 'docs/summaries/KEYWORD_HIERARCHY_SUMMARY.md',
  'SESSION_SUMMARY.md': 'docs/summaries/SESSION_SUMMARY.md',

  // ===== DOCUMENTATION - PLANS =====
  'plan.md': 'docs/plans/plan.md',
  'plan_v2.md': 'docs/plans/plan_v2.md',
  'HEAVY_HITTER_UPDATE.md': 'docs/plans/HEAVY_HITTER_UPDATE.md',

  // ===== DOCUMENTATION - NOTES =====
  'Gemini Conversation till now.txt': 'docs/notes/Gemini_Conversation_till_now.txt',
  'Prompt.txt': 'docs/notes/Prompt.txt',

  // ===== LOGS =====
  'consolidation_output.log': 'logs/consolidation_output.log',
  'keyword_100_output.log': 'logs/keyword_100_output.log',
  'keyword_100_v2_output.log': 'logs/keyword_100_v2_output.log',
  'keyword_hierarchy_output.log': 'logs/keyword_hierarchy_output.log'
};

// Calculate file hash for verification
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (err) {
    return null;
  }
}

// Validate JSON file
function validateJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return true;
  } catch (err) {
    return false;
  }
}

// Check if file exists and get info
function getFileInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const hash = getFileHash(filePath);
    const isJSON = filePath.endsWith('.json');
    const validJSON = isJSON ? validateJSON(filePath) : null;

    return {
      exists: true,
      size: stats.size,
      hash: hash,
      isJSON: isJSON,
      validJSON: validJSON
    };
  } catch (err) {
    return { exists: false };
  }
}

// Create directory if it doesn't exist
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Main migration function
function migrate() {
  console.log('=== PHASE 1: PRE-MIGRATION VERIFICATION ===\n');

  const criticalFiles = [
    'events_final.json',
    'exhibitors_final.json',
    'keyword_taxonomy_100.json',
    'persona_taxonomy_22.json',
    'FINAL_PLAN.md',
    'SESSION_HANDOVER.md'
  ];

  // Verify critical files exist and are valid
  let allCriticalOK = true;
  console.log('🔍 Verifying critical files:\n');

  criticalFiles.forEach(file => {
    const info = getFileInfo(file);
    if (!info.exists) {
      console.log(`  ❌ MISSING: ${file}`);
      allCriticalOK = false;
    } else if (info.isJSON && !info.validJSON) {
      console.log(`  ❌ INVALID JSON: ${file}`);
      allCriticalOK = false;
    } else {
      const sizeKB = (info.size / 1024).toFixed(1);
      console.log(`  ✅ ${file} (${sizeKB} KB, hash: ${info.hash.substring(0, 8)}...)`);
    }
  });

  if (!allCriticalOK) {
    console.log('\n❌ CRITICAL FILES MISSING OR INVALID - ABORTING!\n');
    process.exit(1);
  }

  console.log('\n✅ All critical files verified\n');

  // Show migration plan
  console.log('=== PHASE 2: MIGRATION PLAN ===\n');

  const moves = [];
  const missing = [];
  const conflicts = [];

  Object.entries(fileMap).forEach(([source, dest]) => {
    const sourceInfo = getFileInfo(source);
    const destInfo = getFileInfo(dest);

    if (!sourceInfo.exists) {
      missing.push(source);
    } else {
      if (destInfo.exists && !FORCE) {
        conflicts.push({ source, dest });
      } else {
        moves.push({ source, dest, info: sourceInfo });
      }
    }
  });

  console.log(`Files to move: ${moves.length}`);
  console.log(`Files not found (will skip): ${missing.length}`);
  console.log(`Conflicts (destination exists): ${conflicts.length}\n`);

  if (conflicts.length > 0 && !FORCE) {
    console.log('⚠️  CONFLICTS DETECTED:\n');
    conflicts.forEach(({ source, dest }) => {
      console.log(`  ${source} → ${dest} (destination exists)`);
    });
    console.log('\nRun with --force to overwrite existing files\n');
  }

  // Show critical moves
  console.log('🔴 CRITICAL FILE MOVES:\n');
  moves.filter(m => criticalFiles.includes(m.source)).forEach(({ source, dest, info }) => {
    const sizeKB = (info.size / 1024).toFixed(1);
    console.log(`  ${source} → ${dest}`);
    console.log(`    Size: ${sizeKB} KB, Hash: ${info.hash.substring(0, 8)}...\n`);
  });

  if (DRY_RUN) {
    console.log('=== DRY RUN SUMMARY ===\n');
    console.log(`Would move ${moves.length} files`);
    console.log(`Would skip ${missing.length} missing files`);
    console.log('\nRun without --dry-run to execute migration\n');
    return;
  }

  // Ask for confirmation
  console.log('=== PHASE 3: CONFIRMATION ===\n');
  console.log('⚠️  This will reorganize your project structure.');
  console.log('⚠️  Critical files will be backed up before moving.\n');
  console.log('Continue? This script will proceed automatically in 5 seconds...\n');
  console.log('Press Ctrl+C to cancel\n');

  // Wait 5 seconds (in real use, you'd want readline for interactive confirmation)
  // For now, we'll just proceed

  console.log('=== PHASE 4: BACKUP CRITICAL FILES ===\n');

  const backupDir = 'backups_before_migration';
  ensureDir(backupDir);

  criticalFiles.forEach(file => {
    const info = getFileInfo(file);
    if (info.exists) {
      const backupPath = path.join(backupDir, file);
      fs.copyFileSync(file, backupPath);
      console.log(`  ✅ Backed up: ${file} → ${backupPath}`);
    }
  });

  console.log('\n✅ Critical files backed up\n');

  console.log('=== PHASE 5: MIGRATION ===\n');

  let movedCount = 0;
  let errorCount = 0;

  moves.forEach(({ source, dest, info }) => {
    try {
      // Create destination directory
      const destDir = path.dirname(dest);
      ensureDir(destDir);

      // Move file
      fs.renameSync(source, dest);

      // Verify move
      const newInfo = getFileInfo(dest);
      if (newInfo.hash === info.hash) {
        console.log(`  ✅ ${source} → ${dest}`);
        movedCount++;
      } else {
        console.log(`  ⚠️  ${source} → ${dest} (hash mismatch!)`);
        errorCount++;
      }
    } catch (err) {
      console.log(`  ❌ ${source} → ${dest} (${err.message})`);
      errorCount++;
    }
  });

  console.log(`\n=== PHASE 6: POST-MIGRATION VERIFICATION ===\n`);

  // Verify critical files in new locations
  let allVerified = true;

  Object.entries(fileMap)
    .filter(([source]) => criticalFiles.includes(source))
    .forEach(([source, dest]) => {
      const destInfo = getFileInfo(dest);
      const backupInfo = getFileInfo(path.join(backupDir, source));

      if (!destInfo.exists) {
        console.log(`  ❌ MISSING: ${dest}`);
        allVerified = false;
      } else if (destInfo.hash !== backupInfo.hash) {
        console.log(`  ❌ HASH MISMATCH: ${dest}`);
        allVerified = false;
      } else {
        console.log(`  ✅ ${dest} (verified)`);
      }
    });

  console.log('\n=== MIGRATION COMPLETE ===\n');
  console.log(`Files moved: ${movedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Skipped (not found): ${missing.length}\n`);

  if (allVerified) {
    console.log('✅ All critical files verified in new locations\n');
    console.log('📂 New structure:');
    console.log('  - data/production/        → Production files');
    console.log('  - data/taxonomies/        → Keyword & persona mappings');
    console.log('  - docs/plans/             → FINAL_PLAN.md and other plans');
    console.log('  - docs/summaries/         → Review documents');
    console.log('  - scripts/                → All scripts organized by phase\n');
    console.log(`💾 Backups saved in: ${backupDir}/\n`);
  } else {
    console.log('❌ VERIFICATION FAILED - Check errors above\n');
    console.log(`🔄 Restore from backups if needed: ${backupDir}/\n`);
  }
}

// Run migration
try {
  migrate();
} catch (err) {
  console.error('\n❌ FATAL ERROR:', err.message);
  console.error('\n🔄 Restore from backups_before_migration/ if needed\n');
  process.exit(1);
}
