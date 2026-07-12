#!/usr/bin/env node
/**
 * Hosted Supabase setup helper for CodeTrace.
 * Validates .env.local, reminds about link/push, then seeds demo users.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvFile(name) {
  const path = resolve(root, name)
  if (!existsSync(path)) return {}
  const vars = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    vars[keyFrom(trimmed, eq)] = trimmed.slice(eq + 1).trim()
  }
  return vars
}

function keyFrom(line, eq) {
  return line.slice(0, eq).trim()
}

const env = loadEnvFile('.env.local')
const url = env.VITE_SUPABASE_URL || ''
const anon = env.VITE_SUPABASE_ANON_KEY || ''
const service = env.SUPABASE_SERVICE_ROLE_KEY || ''

console.log('CodeTrace hosted Supabase setup\n')

const missing = []
if (!url || url.includes('127.0.0.1') || url.includes('YOUR_PROJECT')) missing.push('VITE_SUPABASE_URL (hosted project URL)')
if (!anon || anon.includes('replace-with')) missing.push('VITE_SUPABASE_ANON_KEY')
if (!service) missing.push('SUPABASE_SERVICE_ROLE_KEY')

if (missing.length) {
  console.error('Update .env.local first:')
  for (const item of missing) console.error(`  - ${item}`)
  console.error('\nSee docs/SUPABASE_SETUP.md')
  process.exit(1)
}

console.log('Env looks configured for hosted Supabase.')
console.log(`  URL: ${url}\n`)

console.log('Step 1 — link project (if not already):')
console.log('  npm run supabase:login')
console.log('  npm run supabase:link\n')

console.log('Step 2 — push migrations:')
const push = spawnSync('npx', ['supabase', 'db', 'push'], { cwd: root, stdio: 'inherit', shell: true })
if (push.status !== 0) {
  console.error('\nMigration push failed. Run `npm run supabase:link` first, then retry.')
  process.exit(push.status ?? 1)
}

console.log('\nStep 3 — create demo users:')
const seed = spawnSync('node', ['scripts/setup-supabase-demo-users.mjs'], { cwd: root, stdio: 'inherit', shell: true })
process.exit(seed.status ?? 0)
