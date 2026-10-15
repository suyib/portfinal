# UX portfolio

A process-first portfolio: each case study is built from ordered **process sections**
(research → define → ideate → prototype → test …), **iterations** (v1 → v2 → v3, each
with what was learned and what changed), **outcomes**, and **media** that can be
attached to a specific section or iteration.

- **Next.js 16** (App Router, Cache Components) on **Vercel**
- **Supabase**: Postgres + Auth + Storage, locked down with row level security
- The front end is intentionally unstyled. The real design goes in later.

## How it fits together

| Area | Where |
| --- | --- |
| Database schema, RLS, storage bucket | `supabase/migrations/` |
| Database tests (constraints + RLS) | `supabase/tests/rls.test.mjs`, run with `npm run test:db` |
| Public reads (cached, invalidated on edit) | `src/lib/data/public.ts` |
| Admin reads / auth gate | `src/lib/data/admin.ts`, `src/lib/auth.ts` |
| All writes (validated server actions) | `src/app/admin/actions.ts`, `src/lib/validation.ts` |
| Admin UI | `src/app/admin/` (`/admin`) |
| Public pages | `src/app/(site)/`, `src/components/case-study.tsx` |

**Security model.** Anyone can read published projects. Only users listed in the
`admins` table can write, and the database enforces that. RLS applies even if
someone calls the Supabase API directly with the public key. Admin pages and
actions also check admin status on every request. Uploads go straight from the
browser to the `project-media` bucket, which only admins can write to.

**Caching.** Public pages are served from cache and never wait on the database.
Every admin save expires the cache, so changes show up on the next page load.

## Setup

### 1. Create a new Supabase project
Create a new project in the [Supabase dashboard](https://supabase.com/dashboard)
(keep your old portfolio's project as it is). Then:

1. **SQL Editor** → paste all of `supabase/migrations/20261015000000_init.sql` → **Run**.
2. **Authentication → Sign In / Providers** → turn **off** “Allow new users to sign up”.
3. **Authentication → Users → Add user** → create yourself with email + password
   (tick “Auto confirm”).
4. **SQL Editor** → make yourself the admin:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

### 2. Run it locally
```bash
cp .env.example .env.local
```
Fill in `.env.local` from **Project Settings → API**. Then run:
```bash
npm install
```
```bash
npm run dev
```
Open http://localhost:3000/admin, sign in, and add a project.

### 3. Push to a new GitHub repo
Create an empty repo on GitHub (e.g. `ux-portfolio`). Then run:
```bash
git remote add origin https://github.com/<you>/ux-portfolio.git
```
```bash
git push -u origin main
```

### 4. Deploy on Vercel
**Add New → Project** → import the repo. Under **Environment Variables**, add the
three variables from `.env.example`. Set `NEXT_PUBLIC_SITE_URL` to the subdomain
below. Then deploy.

### 5. Put it on a subdomain
In the Vercel project: **Settings → Domains → Add** → e.g. `work.yourdomain.com`.
- If the domain's DNS is already managed by Vercel (likely, from the old portfolio),
  this connects automatically.
- If not, add the **CNAME** record Vercel shows (name `work`) at your DNS provider.

To move to the root domain later, remove `yourdomain.com` from the old Vercel
project, add it to this one, and update `NEXT_PUBLIC_SITE_URL`.

## Scripts
| | |
| --- | --- |
| `npm run dev` | local dev server |
| `npm run build` | production build (needs the env vars, since it reads published data) |
| `npm run typecheck` | TypeScript |
| `npm run test:db` | apply migrations to an in-memory Postgres and check constraints + RLS |
| `npm run db:types` | regenerate `database.types.ts` from the linked project (`npx supabase link` first) |

## Changing the schema
Add a new file to `supabase/migrations/` (don't edit the applied one) and run it
in the SQL editor. Then run `npm run test:db` and `npm run db:types`.
