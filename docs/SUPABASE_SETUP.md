# Supabase setup (hosted) — CodeTrace

Use a **hosted Supabase project** when Docker is not available locally.

## 1. Create a project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → pick org, name (e.g. `codetrace`), region, database password
3. Wait until the project is ready (~2 minutes)

## 2. Copy API keys

Dashboard → **Project Settings** → **API**

| Key | Use |
|-----|-----|
| Project URL | `VITE_SUPABASE_URL` |
| `anon` `public` key | `VITE_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` (setup scripts only) |

Also note **Project ref** (Settings → General) for linking the CLI.

## 3. Configure `.env.local`

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Setup scripts only — never expose in frontend code
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Restart `npm run dev` after changing env vars.

## 4. Link CLI and push migrations

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

`db push` applies all files in `supabase/migrations/` (profiles, placement schema, storage policies).

## 5. Create demo users

```powershell
node scripts/setup-supabase-demo-users.mjs
```

Or the combined helper:

```powershell
npm run supabase:setup-hosted
```

### Staff logins

Set a unique password of at least 12 characters before running the user setup:

```powershell
$env:PLACEMENT_STAFF_PASSWORD = "use-a-unique-password"
```

| Role | Email |
|------|-------|
| Admin | `admin@rcee.ac.in` |
| TPO | `tpo@rcee.ac.in` |
| Faculty | `faculty@rcee.ac.in` |
| Interviewer | `interviewer@rcee.ac.in` |

Only these dedicated RCEE accounts can sign in to the placement office portal.
Legacy `*.tracker.local` demo accounts are retired by the setup script.

Sign in: **http://localhost:5173/login**

## 6. Optional sample data

```powershell
npx supabase db execute -f scripts/seed-placement-demo.sql --linked
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Failed to fetch` on login | Check URL/anon key; restart dev server |
| `relation does not exist` | Run `npx supabase db push` |
| Demo script permission error | Use `service_role` key, not `anon` |
| Storage upload fails | Dashboard → Storage → confirm `resumes` bucket exists after migration |

## Local Supabase (optional later)

Requires **Docker Desktop**. Then:

```powershell
npx supabase start
npx supabase db reset
node scripts/setup-supabase-demo-users.mjs
```

Default local URL: `http://127.0.0.1:54321` with the anon key in `.env.example`.
