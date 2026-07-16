/**
 * Clears all student profiles and placement demo/dummy data from hosted Supabase.
 *
 * Usage:
 *   node scripts/clear-placement-demo-data.mjs
 *
 * Requires .env.local:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const envPath = path.join(root, '.env.local')

function loadEnvLocal() {
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvLocal()

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function deleteAll(table, label = table) {
  const { error, count } = await client.from(table).delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) {
    // Some tables may not exist in older DBs — skip those.
    if (error.code === '42P01' || /does not exist/i.test(error.message)) {
      console.log(`skip ${label} (table missing)`)
      return 0
    }
    throw new Error(`${label}: ${error.message}`)
  }
  console.log(`cleared ${label}: ${count ?? 'ok'}`)
  return count ?? 0
}

async function listAllPaths(bucket, prefix = '') {
  const { data, error } = await client.storage.from(bucket).list(prefix || '', { limit: 1000 })
  if (error) throw error
  const paths = []
  for (const entry of data ?? []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name
    // Folders usually have id === null in list results
    if (entry.id == null) {
      paths.push(...(await listAllPaths(bucket, full)))
    } else {
      paths.push(full)
    }
  }
  return paths
}

async function clearResumeStorage() {
  const bucket = 'resumes'
  try {
    const paths = await listAllPaths(bucket)
    if (!paths.length) {
      console.log('cleared resume storage objects: 0')
      return
    }
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100)
      const { error } = await client.storage.from(bucket).remove(chunk)
      if (error) console.warn(`storage remove warning: ${error.message}`)
    }
    console.log(`cleared resume storage objects: ${paths.length}`)
  } catch (err) {
    console.warn(`storage cleanup warning: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function main() {
  console.log('Clearing placement dummy/student data…')

  // Order: dependents first, then parents.
  await deleteAll('student_update_tokens')
  await deleteAll('student_update_campaigns')
  await deleteAll('student_resumes')
  await deleteAll('student_tech_skills')
  await deleteAll('student_role_interests')
  await deleteAll('readiness_snapshots')
  await deleteAll('company_match_snapshots')
  await deleteAll('resume_book_student_snapshots')
  await deleteAll('student_coding_snapshots')
  await deleteAll('communication_evaluations')
  await deleteAll('aptitude_scores')
  await deleteAll('verbal_scores')
  await deleteAll('codenow_challenge_scores')
  await deleteAll('codenow_profiles')
  await deleteAll('student_profiles')
  await deleteAll('placement_interviews')
  await deleteAll('resume_book_snapshots')
  await deleteAll('company_requirements')
  await deleteAll('companies')

  await clearResumeStorage()

  const { count: remainingStudents, error } = await client
    .from('student_profiles')
    .select('*', { count: 'exact', head: true })
  if (error) throw error

  console.log(`\nDone. Remaining students: ${remainingStudents ?? 0}`)
  console.log('Staff accounts and auth users were not deleted.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
