#!/usr/bin/env node
/**
 * Create placement demo Auth users + placement_user_profiles on hosted Supabase.
 *
 * Requires in environment (or .env.local parsed manually):
 *   SUPABASE_URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/setup-supabase-demo-users.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

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
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    vars[key] = value
  }
  return vars
}

const env = { ...loadEnvFile('.env.local'), ...process.env }
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing Supabase credentials.')
  console.error('Set VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.error('Get the service role key from Supabase Dashboard → Settings → API')
  process.exit(1)
}

const DEMO_PASSWORD = 'demo123'

const DEMO_USERS = [
  { email: 'admin@tracker.local', fullName: 'Admin User', role: 'admin' },
  { email: 'tpo@tracker.local', fullName: 'TPO User', role: 'tpo' },
  { email: 'faculty@tracker.local', fullName: 'Faculty User', role: 'faculty' },
  { email: 'interviewer@tracker.local', fullName: 'Interviewer User', role: 'interviewer' },
  { email: 'hr@tracker.local', fullName: 'HR User', role: 'hr' },
  { email: 'student@tracker.local', fullName: 'Student User', role: 'student', rollNumber: 'CS2024001' },
]

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function ensureUser({ email, fullName, role, rollNumber }) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError

  let user = listed.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (error) throw error
    user = data.user
    console.log(`Created auth user: ${email}`)
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: DEMO_PASSWORD })
    if (error) throw error
    console.log(`Updated password for: ${email}`)
  }

  const { error: profileError } = await admin.from('placement_user_profiles').upsert({
    id: user.id,
    email,
    full_name: fullName,
    role,
    roll_number: rollNumber ?? null,
    is_active: true,
  })
  if (profileError) {
    if (profileError.code === 'PGRST205') {
      console.warn(`Skipped placement profile for ${email} — run migrations first (npm run supabase:push)`)
    } else {
      throw profileError
    }
  } else {
    console.log(`Linked placement profile (${role}): ${email}`)
  }
}

console.log('Setting up CodeTrace placement demo users…\n')

for (const demo of DEMO_USERS) {
  await ensureUser(demo)
}

console.log('\nDone. Demo logins (password: demo123):')
for (const demo of DEMO_USERS) {
  console.log(`  ${demo.role.padEnd(12)} ${demo.email}`)
}
console.log('\nSign in at http://localhost:5173/login')
