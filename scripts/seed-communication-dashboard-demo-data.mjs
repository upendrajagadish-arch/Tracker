#!/usr/bin/env node
/**
 * Seeds demo students specifically for Communication Evaluation badge dashboards.
 *
 * Creates:
 * - public.student_profiles (only demo rows with roll_number prefix)
 * - public.communication_evaluations (one evaluation per demo student)
 *
 * Usage (terminal — NOT the Supabase SQL editor):
 *   node scripts/seed-communication-dashboard-demo-data.mjs
 *
 * SQL alternative (Supabase Dashboard → SQL Editor):
 *   scripts/seed-communication-dashboard-demo-data.sql
 *
 * Requires:
 *   VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local
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

const ACADEMIC_BATCHES = ['2023-2027', '2024-2028', '2025-2029', '2026-2030', '2027-2031']
const BRANCHES = ['CSE', 'CSE-AI', 'AI&DS', 'AI&ML', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL']
const PER_COMBINATION = 3

const goldScores = [200, 220, 250]
const silverScores = [150, 175, 199]
const bronzeScores = [0, 100, 149]

function readinessStatusFromScore(score) {
  if (score >= 85) return 'highly_ready'
  if (score >= 70) return 'ready'
  if (score >= 55) return 'developing'
  if (score >= 40) return 'needs_work'
  return 'not_ready'
}

function riskLevelFromScore(score) {
  if (score >= 85) return 'low'
  if (score >= 55) return 'medium'
  return 'high'
}

function placementStatusFromScore(score) {
  if (score >= 90) return 'PLACED'
  if (score >= 80) return 'READY'
  if (score >= 70) return 'SHORTLISTED'
  if (score >= 55) return 'IN_TRAINING'
  return 'NOT_STARTED'
}

function sectionTotalsFromTotal(total) {
  switch (total) {
    case 250:
      return { communication_proficiency_total: 80, presentation_skills_total: 60, behavioural_skills_total: 110 }
    case 220:
      return { communication_proficiency_total: 80, presentation_skills_total: 60, behavioural_skills_total: 80 }
    case 200:
      return { communication_proficiency_total: 70, presentation_skills_total: 60, behavioural_skills_total: 70 }
    case 199:
      return { communication_proficiency_total: 70, presentation_skills_total: 50, behavioural_skills_total: 79 }
    case 175:
      return { communication_proficiency_total: 65, presentation_skills_total: 45, behavioural_skills_total: 65 }
    case 150:
      return { communication_proficiency_total: 60, presentation_skills_total: 40, behavioural_skills_total: 50 }
    case 149:
      return { communication_proficiency_total: 50, presentation_skills_total: 40, behavioural_skills_total: 59 }
    case 100:
      return { communication_proficiency_total: 40, presentation_skills_total: 20, behavioural_skills_total: 40 }
    case 0:
      return { communication_proficiency_total: 0, presentation_skills_total: 0, behavioural_skills_total: 0 }
    default: {
      const proficiency = Math.min(80, Math.round(total * 0.35))
      const presentation = Math.min(60, Math.round(total * 0.25))
      const behavioural = Math.max(0, total - proficiency - presentation)
      return {
        communication_proficiency_total: proficiency,
        presentation_skills_total: presentation,
        behavioural_skills_total: behavioural,
      }
    }
  }
}

function gradeFromBadgeAndTotal(totalScore) {
  if (totalScore >= 200) return 'A+'
  if (totalScore >= 150) return 'B+'
  return 'Needs Improvement'
}

function computeTotalScore(idx1Based) {
  const mod = idx1Based % 3
  if (mod === 1) return goldScores[Math.floor(idx1Based / 3) % goldScores.length]
  if (mod === 2) return silverScores[Math.floor(idx1Based / 3) % silverScores.length]
  return bronzeScores[Math.floor(idx1Based / 3) % bronzeScores.length]
}

async function main() {
  console.log('Seeding Communication Dashboard demo data…')

  const { data: demoProfiles, error: demoListErr } = await client
    .from('student_profiles')
    .select('id, roll_number')
    .ilike('roll_number', `${DEMO_ROLL_PREFIX}%`)

  if (demoListErr) {
    console.error(`Failed to list demo student_profiles: ${demoListErr.message}`)
    process.exit(1)
  }

  const ids = (demoProfiles ?? []).map((p) => p.id)
  if (ids.length) {
    console.log(`Clearing existing demo rows: ${ids.length} students`)
    const { error: evalDelErr } = await client.from('communication_evaluations').delete().in('student_profile_id', ids)
    if (evalDelErr) throw evalDelErr
    const { error: profileDelErr } = await client.from('student_profiles').delete().in('id', ids)
    if (profileDelErr) throw profileDelErr
  } else {
    console.log('No existing demo rows found.')
  }

  const profilesToInsert = []
  const evalMetaByRoll = new Map()

  let idx = 0
  for (const academicBatch of ACADEMIC_BATCHES) {
    for (const branch of BRANCHES) {
      for (let k = 0; k < PER_COMBINATION; k += 1) {
        idx += 1
        const rollNumber = `${DEMO_ROLL_PREFIX}${String(idx).padStart(4, '0')}`
        const fullName = `Demo Student ${idx}`

        const readinessScore = 35 + ((idx * 7) % 66)
        const readinessStatus = readinessStatusFromScore(readinessScore)
        const riskLevel = riskLevelFromScore(readinessScore)
        const placementStatus = placementStatusFromScore(readinessScore)

        const cgpa = Number((6 + (idx % 35) / 10).toFixed(2))
        const isPlacementEligible = readinessScore >= 70 || placementStatus === 'PLACED'

        const totalScore = computeTotalScore(idx)
        const percentage = Math.round((totalScore / 250) * 100)
        const grade = gradeFromBadgeAndTotal(totalScore)
        const totals = sectionTotalsFromTotal(totalScore)

        const email = `demo${idx}@demo.local`
        const evaluationDate = new Date(Date.now() - idx * 60_000).toISOString()

        profilesToInsert.push({
          roll_number: rollNumber,
          full_name: fullName,
          email,
          phone: '',
          branch,
          batch: academicBatch,
          academic_batch: academicBatch,
          section: 'N/A',
          address: '',
          certifications_summary: '',
          internship_summary: '',
          date_of_birth: null,
          cgpa,
          active_backlogs: idx % 5,
          graduation_year: null,
          placement_status: placementStatus,
          profile_completeness: Math.round(readinessScore),
          readiness_score: readinessScore,
          readiness_status: readinessStatus,
          risk_level: riskLevel,
          is_placement_eligible: isPlacementEligible,
          communication_score: percentage,
          communication_grade: grade,
          last_communication_evaluation_at: evaluationDate,
          aptitude_score: null,
          aptitude_grade: null,
          last_aptitude_at: null,
          verbal_score: null,
          verbal_grade: null,
          last_verbal_at: null,
          codenow_score: null,
          codenow_grade: null,
          last_codenow_at: null,
          linkedin_url: '',
          github_url: '',
          portfolio_url: '',
          skills_summary: 'Demo skills',
          career_interest: 'Demo interest',
          platform_handles: {},
          projects_summary: '',
          is_active: true,
          share_token: null,
          is_shareable: false,
        })

        evalMetaByRoll.set(rollNumber, {
          branch,
          email,
          fullName,
          totalScore,
          percentage,
          grade,
          ...totals,
          evaluation_date: evaluationDate,
        })
      }
    }
  }

  console.log(`Inserting ${profilesToInsert.length} demo student_profiles…`)
  const { data: insertedProfiles, error: insErr } = await client
    .from('student_profiles')
    .insert(profilesToInsert)
    .select('id, roll_number')

  if (insErr) {
    console.error(`Failed to insert student_profiles: ${insErr.message}`)
    process.exit(1)
  }

  const evalsToInsert = []
  for (const p of insertedProfiles ?? []) {
    const meta = evalMetaByRoll.get(p.roll_number)
    if (!meta) continue
    evalsToInsert.push({
      student_profile_id: p.id,
      roll_number: p.roll_number,
      student_name: meta.fullName,
      department: meta.branch,
      email: meta.email,
      source: 'manual',
      evaluator_name: 'Demo Seeder',
      evaluator_role: 'tpo',
      notes: '',
      is_active: true,
      evaluation_date: meta.evaluation_date,
      max_score: 250,
      total_score: meta.totalScore,
      percentage: meta.percentage,
      grade: meta.grade,
      communication_proficiency_total: meta.communication_proficiency_total,
      presentation_skills_total: meta.presentation_skills_total,
      behavioural_skills_total: meta.behavioural_skills_total,
    })
  }

  console.log(`Inserting ${evalsToInsert.length} communication_evaluations…`)
  const { error: evalInsErr } = await client.from('communication_evaluations').insert(evalsToInsert)
  if (evalInsErr) {
    console.error(`Failed to insert communication_evaluations: ${evalInsErr.message}`)
    process.exit(1)
  }

  console.log('Done ✅')
  console.log(`Demo roll_number prefix: ${DEMO_ROLL_PREFIX}`)
  console.log('Now open Placement → Communication Evaluation → Dashboard and Apply filters.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

