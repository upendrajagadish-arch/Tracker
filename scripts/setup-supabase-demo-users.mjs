#!/usr/bin/env node
/**
 * Create dedicated RCEE placement staff Auth users + placement_user_profiles.
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

const STAFF_PASSWORD = env.PLACEMENT_STAFF_PASSWORD

if (!STAFF_PASSWORD || STAFF_PASSWORD.length < 12) {
  console.error('Missing or weak PLACEMENT_STAFF_PASSWORD (minimum 12 characters).')
  process.exit(1)
}

const FACULTY_PASSWORD = env.FACULTY_PASSWORD || 'RCE_FAC'

const STAFF_USERS = [
  { email: 'admin@rcee.ac.in', fullName: 'RCEE Admin', role: 'admin' },
  { email: 'tpo@rcee.ac.in', fullName: 'RCEE TPO', role: 'tpo' },
  { email: 'faculty@rcee.ac.in', fullName: 'RCEE Faculty', role: 'faculty' },
  {
    email: 'sridurgadevipujari@rcee.ac.in',
    fullName: 'Sri Durga Devi Pujari',
    role: 'faculty',
    password: FACULTY_PASSWORD,
  },
  {
    email: 'shaiknasira@rcee.ac.in',
    fullName: 'Shaik Nasira',
    role: 'faculty',
    password: FACULTY_PASSWORD,
  },
  { email: 'interviewer@rcee.ac.in', fullName: 'RCEE Interviewer', role: 'interviewer' },
]

const RETIRED_EMAILS = [
  'admin@tracker.local',
  'tpo@tracker.local',
  'faculty@tracker.local',
  'interviewer@tracker.local',
  'hr@tracker.local',
  'student@tracker.local',
]

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function listAllUsers() {
  const users = []
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 1000) break
    page += 1
  }
  return users
}

async function ensureUser({ email, fullName, role, rollNumber, password }) {
  const accountPassword = password || STAFF_PASSWORD
  const users = await listAllUsers()
  let user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: accountPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (error) throw error
    user = data.user
    console.log(`Created auth user: ${email}`)
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: accountPassword,
      ban_duration: 'none',
      user_metadata: { full_name: fullName },
    })
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

async function retireUser(email) {
  const users = await listAllUsers()
  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) {
    console.log(`Retired account not found (skipped): ${email}`)
    return
  }

  const { error: banError } = await admin.auth.admin.updateUserById(user.id, {
    ban_duration: '876000h',
  })
  if (banError) throw banError

  const { error: profileError } = await admin
    .from('placement_user_profiles')
    .update({ is_active: false })
    .eq('id', user.id)
  if (profileError && profileError.code !== 'PGRST205') throw profileError

  console.log(`Retired legacy login: ${email}`)
}

console.log('Setting up RCEE placement staff accounts…\n')

for (const retired of RETIRED_EMAILS) {
  await retireUser(retired)
}

for (const staff of STAFF_USERS) {
  await ensureUser(staff)
}

console.log('\nDone. Dedicated staff logins created with PLACEMENT_STAFF_PASSWORD:')
for (const staff of STAFF_USERS) {
  console.log(`  ${staff.role.padEnd(8)} ${staff.email}`)
}
console.log('\nSign in at http://localhost:5173/login')
