#!/usr/bin/env node
/**
 * Placement demo seed helper.
 *
 * Seeds starter tech skills only (no dummy students/companies).
 *
 * Usage:
 *   node scripts/seed-placement-demo.mjs
 * or apply SQL:
 *   supabase db execute -f scripts/seed-placement-demo.sql
 *
 * To wipe students/demo data:
 *   node scripts/clear-placement-demo-data.mjs
 */
 *
 * Auth users cannot be created from SQL alone on hosted Supabase.
 * 1. Create users in Supabase Auth Dashboard (email/password).
 * 2. Link each user in placement_user_profiles (id = auth.users.id, role = admin|tpo|...).
 * 3. Run: supabase db execute -f scripts/seed-placement-demo.sql
 *
 * Or with local Supabase:
 *   supabase db reset
 *   node scripts/seed-placement-demo.mjs
 */

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.join(__dirname, 'seed-placement-demo.sql')

console.log('CodeTrace placement demo seed')
console.log('')
console.log('Before running SQL seed:')
console.log('  - Apply migrations: supabase db reset  (or supabase db push)')
console.log('  - Create Auth users and placement_user_profiles rows manually')
console.log('')
console.log(`Applying ${sqlPath} …`)

const result = spawnSync('supabase', ['db', 'execute', '-f', sqlPath], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.error) {
  console.error('\nCould not run supabase CLI. Apply seed manually:')
  console.error(`  supabase db execute -f scripts/seed-placement-demo.sql`)
  process.exit(1)
}

process.exit(result.status ?? 0)
