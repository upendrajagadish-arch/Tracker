#!/usr/bin/env node
/**
 * Probe communication evaluation schema; try `supabase db query --linked -f …`.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  const path = resolve(root, '.env.local')
  const vars = {}
  if (!existsSync(path)) return vars
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    vars[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  }
  return vars
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const service = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !service) {
  console.error('Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const client = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { error: tableError } = await client
  .from('communication_evaluations')
  .select('id, total_score, percentage')
  .limit(1)
const { error: colError } = await client
  .from('student_profiles')
  .select('id, communication_score, communication_grade, last_communication_evaluation_at')
  .limit(1)

const tableMissing =
  tableError &&
  (tableError.message?.includes('Could not find the table') ||
    tableError.code === 'PGRST205' ||
    tableError.code === '42P01')

const wrongSchema =
  tableError &&
  (tableError.message?.includes('total_score') ||
    tableError.message?.includes('total_marks') ||
    tableError.code === 'PGRST204')

const colsMissing =
  colError &&
  (colError.message?.includes('communication_score') ||
    colError.message?.includes('schema cache') ||
    colError.code === 'PGRST204')

console.log('Probe results:')
console.log(
  '  communication_evaluations:',
  tableMissing ? 'MISSING' : wrongSchema ? `WRONG/OLD SCHEMA: ${tableError.message}` : tableError ? `ERROR: ${tableError.message}` : 'OK (250M schema)',
)
console.log(
  '  student_profiles communication fields:',
  colsMissing ? 'MISSING' : colError ? `ERROR: ${colError.message}` : 'OK',
)

if (!tableMissing && !wrongSchema && !colsMissing && !tableError && !colError) {
  console.log('\nSchema looks ready. Try Save again in the app.')
  process.exit(0)
}

const sqlPath = resolve(root, 'scripts/apply-communication-evaluation-migration.sql')
console.log('\nApplying migration via: npx supabase db query --linked -f …')

const push = spawnSync(
  'npx',
  ['supabase', 'db', 'query', '--linked', '-f', sqlPath],
  { cwd: root, stdio: 'inherit', shell: true },
)

if (push.status === 0) {
  console.log('\nMigration applied.')
  process.exit(0)
}

console.log('\nAuto-apply failed (project likely not linked).')
console.log('Do this once in Supabase Dashboard → SQL Editor:')
console.log(`  Open and run: ${sqlPath}`)
process.exit(1)
