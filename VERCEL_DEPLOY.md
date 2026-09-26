# CareFlow Intelligence — Vercel Production Deployment Guide

The app was failing on Vercel with "Server error. Please try again in a moment." because it used **SQLite with a local file** (`file:./db/custom.db`). Vercel serverless functions have an **ephemeral, read-only filesystem** — the SQLite file can't be written to and isn't bundled into the function, so every DB operation failed.

This guide fixes that by switching to **Neon Postgres** (free, serverless, native Vercel integration). All existing models, data, and code work unchanged — only the connection string changes.

---

## What changed in the code

1. **Prisma provider**: `sqlite` → `postgresql` (`prisma/schema.prisma`). Models are identical.
2. **JWT_SECRET**: now **required in production** (no more insecure hardcoded fallback). Throws a clear error if missing.
3. **`postinstall` hook**: `prisma generate` runs during `vercel build` so the Prisma client is generated.
4. **Error logging**: auth routes now `console.error` the real underlying cause (DB errors, missing env vars) so it shows in **Vercel → Functions → Logs**.
5. **`/api/health` route**: visit `https://your-app.vercel.app/api/health` to check DB connectivity + env-var status without guessing.

---

## Exact environment variables to add in Vercel

Go to **Vercel → your project → Settings → Environment Variables** and add these **two** variables (for all environments: Production, Preview, Development):

### 1. `DATABASE_URL` (required)

A PostgreSQL connection string. Easiest source: **Neon** (free, serverless Postgres built for Vercel).

**Get it:**
1. Go to https://neon.tech → Sign up (free, no credit card).
2. Create a new project (name it `careflow`).
3. On the project dashboard, copy the **connection string** — it looks like:
   ```
   postgresql://neondb_owner:npg_secret_password@ep-abc123.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. In Vercel, add env var:
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://neondb_owner:npg_secret_password@ep-abc123.us-east-2.aws.neon.tech/neondb?sslmode=require`
   - **Environments**: ✓ Production, ✓ Preview, ✓ Development

> ⚠️ Keep the `?sslmode=require` at the end — Neon requires SSL.
> ⚠️ For serverless, also append `&pgbouncer=true&connect_timeout=15` if you see connection-limit errors:
> ```
> postgresql://...neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15
> ```

### 2. `JWT_SECRET` (required)

A random string, at least 32 characters, used to sign session tokens. **Generate one now** — run this in any terminal:

```bash
openssl rand -base64 48
```

(Or use https://generate-secret.now.sh/32 — copy a fresh value, don't reuse.)

In Vercel, add env var:
- **Key**: `JWT_SECRET`
- **Value**: `<paste the generated 48+ char string>`
- **Environments**: ✓ Production, ✓ Preview, ✓ Development

---

## Step-by-step Vercel setup

1. **Push the latest code** to your Git repo (the Prisma + JWT changes are in this commit).
2. In Vercel, go to **Project Settings → Environment Variables** and add `DATABASE_URL` and `JWT_SECRET` (above).
3. **Create the database tables** — run ONE of these locally (with the Neon `DATABASE_URL` in your local `.env` temporarily):
   ```bash
   # Option A: push schema directly (simplest)
   bun run db:push

   # Option B: or set DATABASE_URL inline
   DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" bun run db:push
   ```
   This creates all tables (User, HospitalDaily, DepartmentDaily, Activity) in your Neon Postgres.
4. **Seed the demo accounts + sample hospital data**:
   ```bash
   DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" bun run scripts/seed-demo.ts
   # then login once to trigger the auto-seed of 365 days of hospital data,
   # OR hit /api/dashboard once with the demo admin token.
   ```
   This creates `admin@careflow.health` / `careflow123` and `reception@careflow.health` / `reception123`.
5. **Redeploy** on Vercel (Vercel auto-redeploys on git push; or click "Redeploy" in the dashboard).
6. **Verify**: visit `https://your-app.vercel.app/api/health` — you should see:
   ```json
   {
     "status": "ok",
     "env": { "DATABASE_URL": "set (postgresql://)", "JWT_SECRET": "set (>=32 chars)" },
     "db": { "connected": true, "scheme": "postgresql" },
     "auth": { "jwtConfigured": true }
   }
   ```
7. **Login** at `https://your-app.vercel.app/` with `admin@careflow.health` / `careflow123`.

---

## If something still breaks

- **Check the health route**: `/api/health` tells you exactly what's wrong (missing env var, DB not reachable, SQLite instead of Postgres, etc.).
- **Check Vercel logs**: Vercel dashboard → your project → **Functions** tab → click the failing function → **Logs**. You'll now see `[auth/login] DB error: ...` with the real cause (e.g. `Can't reach database server`, `relation "User" does not exist` = tables not created = run `db:push`).
- **Common fixes**:
  - `relation "User" does not exist` → you forgot step 3 (`bun run db:push` with the Neon URL). Run it.
  - `Can't reach database server` → wrong Neon URL, or Neon project paused (free tier sleeps after inactivity; resume it in the Neon dashboard).
  - `JWT_SECRET is not set` → you forgot step 2 (add `JWT_SECRET` env var).
  - `DATABASE_URL is a local SQLite file path` → you accidentally set the old `file:./db/custom.db` value. Use the Neon `postgresql://` URL instead.

---

## Summary — the two env vars to copy into Vercel

| Key | Value | Source |
|-----|-------|--------|
| `DATABASE_URL` | `postgresql://<user>:<pass>@<host>/<db>?sslmode=require&pgbouncer=true&connect_timeout=15` | Neon project dashboard |
| `JWT_SECRET` | (48+ char random string from `openssl rand -base64 48`) | generate locally |

Both must be set for **Production, Preview, and Development** environments in Vercel.

That's it — no other code changes needed. The app is fully Vercel-ready after adding these two env vars and running `bun run db:push` once against the Neon database.
