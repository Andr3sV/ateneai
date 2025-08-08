import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const sqlPath = process.argv[2];
  if (!sqlPath) {
    console.error('Usage: ts-node scripts/run-sql.ts <path-to-sql>');
    process.exit(1);
  }

  const fullPath = path.resolve(__dirname, '..', sqlPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`SQL file not found: ${fullPath}`);
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const sql = fs.readFileSync(fullPath, 'utf8');

  // Split into statements (naive split by ;) and execute sequentially
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  let ok = 0;
  for (const stmt of statements) {
    try {
      // Requires a Postgres function to execute raw SQL, or use pg client.
      // We use a dedicated function 'exec_sql' which should exist.
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      if (error) throw error;
      ok++;
      console.log('✅ Executed:', stmt.substring(0, 80).replace(/\s+/g, ' '), '...');
    } catch (e: any) {
      console.error('❌ Failed:', e.message);
      process.exit(1);
    }
  }

  console.log(`\nDone. Executed ${ok}/${statements.length} statements.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

