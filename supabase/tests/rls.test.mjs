import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Applies every migration to an in-memory Postgres (PGlite) with stubbed Supabase
// auth/storage schemas, then checks constraints and row level security.
// Run with: npm run test:db

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../migrations')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => path.join(dir, f))
const db = new PGlite()

// Minimal Supabase stand-ins
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(),
    bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`)

for (const f of files) {
  await db.exec(fs.readFileSync(f, 'utf8'))
  console.log('applied', path.basename(f))
}

// Supabase grants table privileges to anon/authenticated by default; RLS does the gating
await db.exec(`
  grant all on all tables in schema public to anon, authenticated;
  grant all on storage.objects to anon, authenticated;
`)

const ADMIN = '00000000-0000-0000-0000-00000000000a'
const OTHER = '00000000-0000-0000-0000-00000000000b'
await db.exec(`insert into auth.users values ('${ADMIN}'), ('${OTHER}');
  insert into public.admins values ('${ADMIN}');`)

async function as(role, sub, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.sub', '${sub ?? ''}', false); set role ${role};`)
  try { return await db.query(sql, params) } finally { await db.exec('reset role') }
}
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) }
const fails = async (p, m) => { try { await p; ok(false, m) } catch (e) { ok(true, `${m} (${e.message.split('\n')[0]})`) } }

// admin creates projects
const draft = (await as('authenticated', ADMIN,
  `insert into projects (slug, title) values ('draft-one', 'Draft') returning id`)).rows[0].id
const pub = (await as('authenticated', ADMIN,
  `insert into projects (slug, title, status) values ('pub-one', 'Pub', 'published') returning id, published_at`)).rows[0]
ok(pub.published_at, 'published_at stamped on publish')

const sec = (await as('authenticated', ADMIN,
  `insert into project_sections (project_id, kind, title) values ($1, 'research', 'Research') returning id`, [pub.id])).rows[0].id
await as('authenticated', ADMIN, `insert into project_sections (project_id, title) values ($1, 'Secret')`, [draft])
await as('authenticated', ADMIN,
  `insert into iterations (project_id, section_id, label) values ($1, $2, 'v1')`, [pub.id, sec])
const img = (await as('authenticated', ADMIN,
  `insert into media (project_id, storage_path, alt_text) values ($1, 'x/y.png', 'Wireframe') returning id`, [pub.id])).rows[0].id
await as('authenticated', ADMIN, `update projects set cover_media_id = $1 where id = $2`, [img, pub.id])
ok(true, 'cover media set')

// constraints
await fails(as('authenticated', ADMIN, `insert into projects (slug, title) values ('Bad Slug', 'x')`), 'slug format enforced')
await fails(as('authenticated', ADMIN, `insert into projects (slug, title) values ('DRAFT-ONE', 'x')`), 'slug unique case-insensitive')
await fails(as('authenticated', ADMIN, `insert into media (project_id, storage_path) values ($1, 'a.png')`, [pub.id]), 'image needs alt text')
await fails(as('authenticated', ADMIN, `insert into media (project_id, kind) values ($1, 'embed')`, [pub.id]), 'embed needs url')
await fails(as('authenticated', ADMIN, `insert into media (project_id, section_id, storage_path, alt_text) values ($1, $2, 'a', 'a')`, [draft, sec]), 'media section must belong to same project')
await fails(as('authenticated', ADMIN, `update projects set cover_media_id = $1 where id = $2`, [img, draft]), 'cover must belong to project')
await fails(as('authenticated', ADMIN, `update site_settings set id = false`), 'settings singleton')

// anon visibility
let r = await as('anon', null, `select slug from projects order by slug`)
ok(r.rows.length === 1 && r.rows[0].slug === 'pub-one', 'anon sees only published projects')
r = await as('anon', null, `select title from project_sections`)
ok(r.rows.length === 1 && r.rows[0].title === 'Research', 'anon sees only published sections')
r = await as('anon', null, `select * from media`)
ok(r.rows.length === 1, 'anon sees published media')
r = await as('anon', null, `select name from site_settings`)
ok(r.rows.length === 1, 'anon reads settings')

// anon / non-admin writes are blocked
r = await as('anon', null, `update projects set title = 'hacked' returning id`)
ok(r.rows.length === 0, 'anon update affects nothing')
await fails(as('anon', null, `insert into projects (slug, title) values ('x', 'x')`), 'anon insert blocked')
await fails(as('authenticated', OTHER, `insert into projects (slug, title) values ('x', 'x')`), 'non-admin insert blocked')
r = await as('authenticated', OTHER, `delete from projects returning id`)
ok(r.rows.length === 0, 'non-admin delete affects nothing')
r = await as('authenticated', OTHER, `select * from projects`)
ok(r.rows.length === 1, 'non-admin sees only published')
r = await as('authenticated', OTHER, `select * from admins`)
ok(r.rows.length === 0, 'non-admin cannot list admins')
await fails(as('authenticated', OTHER, `insert into admins values ('${OTHER}')`), 'cannot self-promote to admin')
await fails(as('anon', null, `select reorder('projects', array[$1]::uuid[])`, [pub.id]), 'anon cannot call reorder')
await as('authenticated', OTHER, `select reorder('projects', array[$1, $2]::uuid[])`, [pub.id, draft])
r = await as('authenticated', ADMIN, `select sort_order from projects where id = $1`, [draft])
ok(r.rows[0].sort_order === 0, 'non-admin reorder has no effect (RLS)')

// storage
await fails(as('authenticated', OTHER, `insert into storage.objects (bucket_id, name) values ('project-media', 'a')`), 'non-admin upload blocked')
await as('authenticated', ADMIN, `insert into storage.objects (bucket_id, name) values ('project-media', 'a')`)
ok(true, 'admin upload allowed')

// admin reorder + touch
const before = (await as('authenticated', ADMIN, `select updated_at from projects where id = $1`, [draft])).rows[0].updated_at
await as('authenticated', ADMIN, `select reorder('projects', array[$1, $2]::uuid[])`, [draft, pub.id])
r = await as('authenticated', ADMIN, `select id, sort_order from projects order by sort_order`)
ok(r.rows[0].id === draft && r.rows[0].sort_order === 1 && r.rows[1].sort_order === 2, 'admin reorder works')
await fails(as('authenticated', ADMIN, `select reorder('admins', array[]::uuid[])`), 'reorder table whitelist')
r = await as('authenticated', ADMIN, `select * from projects where id = $1`, [draft])
ok(r.rows.length === 1, 'admin sees drafts')

// tags
await as('authenticated', ADMIN, `select set_project_tags($1, array['Research', 'research ', 'Mobile', ''])`, [pub.id])
r = await as('anon', null, `select t.name from project_tags pt join tags t on t.id = pt.tag_id order by 1`)
ok(r.rows.map((x) => x.name).join() === 'Mobile,Research', 'tags dedupe case-insensitively')
await as('authenticated', ADMIN, `select set_project_tags($1, array['mobile', 'B2B'])`, [pub.id])
r = await as('authenticated', ADMIN, `select name from tags order by 1`)
ok(r.rows.map((x) => x.name).join() === 'B2B,Mobile', 'tags replaced, orphans removed, existing case kept')
await fails(as('authenticated', OTHER, `select set_project_tags($1, array['x'])`, [pub.id]), 'non-admin cannot set tags')
await fails(as('authenticated', ADMIN, `insert into media (project_id, kind, embed_url) values ($1, 'embed', 'javascript:alert(1)')`, [pub.id]), 'embed must be https')

// cascade
await as('authenticated', ADMIN, `delete from projects where id = $1`, [pub.id])
r = await as('authenticated', ADMIN, `select (select count(*) from media) m, (select count(*) from iterations) i, (select count(*) from project_sections) s`)
ok(Number(r.rows[0].m) === 0 && Number(r.rows[0].i) === 0 && Number(r.rows[0].s) === 1, 'delete cascades to children')
void before
if (!process.exitCode) console.log('\nall database checks passed')
