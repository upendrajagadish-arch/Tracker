#!/usr/bin/env node
/**
 * Clears ONLY demo rows created by seed-communication-dashboard-demo-data.mjs.
 *
 * Usage (terminal — NOT the Supabase SQL editor):
 *   node scripts/clear-communication-dashboard-demo-data.mjs
 *
 * SQL alternative (Supabase Dashboard → SQL Editor):
 *   scripts/clear-communication-dashboard-demo-data.sql
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
  console.error('Missing VITE_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const DEMO_ROLL_PREFIX = 'DEMO_COMM_'

async function main() {
  console.log('Clearing Communication Dashboard demo data…')

  const { data: demoProfiles, error: listErr } = await client
    .from('student_profiles')
    .select('id, roll_number')
    .ilike('roll_number', `${DEMO_ROLL_PREFIX}%`)

  if (listErr) {
    console.error(`Failed to list demo student_profiles: ${listErr.message}`)
    process.exit(1)
  }

  const ids = (demoProfiles ?? []).map((p) => p.id)
  if (!ids.length) {
    console.log('No demo rows found.')
    process.exit(0)
  }

  const { error: evalDelErr } = await client.from('communication_evaluations').delete().in('student_profile_id', ids)
  if (evalDelErr) throw evalDelErr

  const { error: profileDelErr } = await client.from('student_profiles').delete().in('id', ids)
  if (profileDelErr) throw profileDelErr

  console.log(`Done ✅ Cleared ${ids.length} demo students.`)
  console.log(`Demo roll_number prefix: ${DEMO_ROLL_PREFIX}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

