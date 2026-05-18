/**
 * fix-whitespace.ts
 * One-shot migration: insert missing spaces in lines that were corrupted by
 * fountain-js dropping soft line-breaks without inserting a space.
 *
 * Pattern: a lowercase (or accented lowercase) letter immediately followed by
 * an uppercase (or accented uppercase) letter, or by common Spanish diacritics
 * like ¿ or ¡ mid-word (less common, but catch it).
 *
 * Run: npx tsx server/scripts/fix-whitespace.ts
 */

import Database from 'better-sqlite3';
import { resolve } from 'path';

const DB_PATH = resolve(__dirname, '../../server/data/screenplays.db');

// Characters that are lowercase in Spanish/Latin scripts
const LOWER = 'a-záéíóúüñàèìòùâêîôûäëïöüãõ';
// Characters that signal a new word starting (uppercase, accented uppercase, ¿, ¡, digits)
const UPPER = 'A-ZÁÉÍÓÚÜÑÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÃÕ0-9¿¡';

// Insert a space between [LOWER][UPPER] runs — the classic soft-break elision.
function repairText(text: string): string {
  // Step 1: lowercase letter immediately followed by uppercase letter
  let fixed = text.replace(
    new RegExp(`([${LOWER}])([${UPPER}])`, 'g'),
    '$1 $2',
  );
  // Step 2: lowercase letter followed by ¿ or ¡ (mid-sentence questions)
  // These are fine without a space: "dijo¿y" should be "dijo ¿y"
  fixed = fixed.replace(/([a-záéíóúüñ])(¿|¡)/g, '$1 $2');
  return fixed;
}

function main() {
  const db = new Database(DB_PATH);

  const rows = db
    .prepare("SELECT id, text FROM line WHERE type IN ('action', 'dialogue')")
    .all() as Array<{ id: string; text: string }>;

  const update = db.prepare('UPDATE line SET text = ? WHERE id = ?');

  let fixed = 0;
  const runAll = db.transaction(() => {
    for (const row of rows) {
      const repaired = repairText(row.text);
      if (repaired !== row.text) {
        update.run(repaired, row.id);
        console.log(`FIXED [${row.id.slice(0, 8)}]`);
        console.log(`  BEFORE: ${row.text.slice(0, 100)}`);
        console.log(`  AFTER:  ${repaired.slice(0, 100)}`);
        fixed++;
      }
    }
  });

  runAll();
  console.log(`\nDone. Fixed ${fixed} / ${rows.length} lines.`);
  db.close();
}

main();
