-- =====================================================================
-- UX portfolio: initial schema
--
-- Model
--   site_settings     singleton row: name, headline, bio, links, CV
--   projects          a case study (draft / published / archived)
--   project_sections  the ordered process write-up (research, define,
--                     ideate, prototype, test, ...) with markdown bodies
--   iterations        versions of the design (v1 -> v2 -> v3), each with
--                     the feedback that drove it and what changed
--   outcomes          headline results / metrics for a project
--   media             images / video / embeds attached to a project and,
--                     optionally, to a specific section or iteration
--   tags, project_tags
--   admins            user ids allowed to write. Everyone else is
--                     read-only and only sees published content.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.project_status as enum ('draft', 'published', 'archived');

create type public.section_kind as enum (
  'overview', 'problem', 'research', 'define', 'ideate',
  'prototype', 'test', 'iterate', 'outcome', 'reflection', 'custom'
);

create type public.media_kind as enum ('image', 'video', 'embed');

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- security definer so policies can call it without exposing admins to RLS
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Site settings (singleton)
-- ---------------------------------------------------------------------
create table public.site_settings (
  id          boolean primary key default true check (id), -- only one row
  name        text not null default '',
  headline    text not null default '',
  bio         text not null default '',               -- markdown
  email       text,
  location    text not null default '',
  resume_url  text,
  links       jsonb not null default '[]'::jsonb       -- [{label, url}]
              check (jsonb_typeof(links) = 'array'),
  updated_at  timestamptz not null default now()
);

insert into public.site_settings (id) values (true);

create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------
create table public.projects (
  id             uuid primary key default gen_random_uuid(),
  -- lowercase-only, so a plain unique constraint is case-insensitive
  slug           text not null unique
                 check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  title          text not null check (length(trim(title)) > 0),
  summary        text not null default '',   -- one-liner for cards
  client         text not null default '',
  role           text not null default '',   -- e.g. "Lead UX designer"
  team           text not null default '',   -- e.g. "2 designers, 3 devs, PM"
  timeline       text not null default '',   -- e.g. "12 weeks, 2025"
  tools          text[] not null default '{}',
  problem        text not null default '',   -- markdown: the brief / challenge
  solution       text not null default '',   -- markdown: the short answer up top
  status         public.project_status not null default 'draft',
  featured       boolean not null default false,
  sort_order     integer not null default 0,
  cover_media_id uuid,                       -- fk added once media exists
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index projects_status_order_idx on public.projects (status, sort_order);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- stamp published_at the first time a project goes live
create or replace function public.stamp_published_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end $$;

create trigger projects_published_at before insert or update on public.projects
  for each row execute function public.stamp_published_at();

-- ---------------------------------------------------------------------
-- Process sections
-- ---------------------------------------------------------------------
create table public.project_sections (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  kind        public.section_kind not null default 'custom',
  title       text not null check (length(trim(title)) > 0),
  body        text not null default '',     -- markdown
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index project_sections_project_idx on public.project_sections (project_id, sort_order);

create trigger project_sections_updated_at before update on public.project_sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Iterations
-- ---------------------------------------------------------------------
create table public.iterations (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  section_id     uuid references public.project_sections (id) on delete set null,
  label          text not null check (length(trim(label)) > 0),  -- "v1", "Round 2"
  title          text not null default '',
  description    text not null default '',   -- markdown: what this version was
  feedback       text not null default '',   -- markdown: what testing / critique showed
  changes        text not null default '',   -- markdown: what changed as a result
  iteration_date date,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index iterations_project_idx on public.iterations (project_id, sort_order);

create trigger iterations_updated_at before update on public.iterations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Outcomes / metrics
-- ---------------------------------------------------------------------
create table public.outcomes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  value       text not null check (length(trim(value)) > 0),  -- "+32%"
  label       text not null check (length(trim(label)) > 0),  -- "task completion"
  detail      text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index outcomes_project_idx on public.outcomes (project_id, sort_order);

-- ---------------------------------------------------------------------
-- Media
-- ---------------------------------------------------------------------
create table public.media (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  section_id    uuid references public.project_sections (id) on delete set null,
  iteration_id  uuid references public.iterations (id) on delete set null,
  kind          public.media_kind not null default 'image',
  storage_path  text,            -- path inside the project-media bucket
  embed_url     text,            -- Figma / YouTube / Loom etc.
  alt_text      text not null default '',
  caption       text not null default '',
  width         integer check (width > 0),
  height        integer check (height > 0),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  constraint media_source_check check (
    (kind = 'embed' and embed_url is not null and embed_url ~ '^https://' and storage_path is null)
    or (kind <> 'embed' and storage_path is not null and embed_url is null)
  ),
  -- images must describe themselves for screen readers
  constraint media_alt_check check (kind <> 'image' or length(trim(alt_text)) > 0)
);

create index media_project_idx on public.media (project_id, sort_order);
create index media_section_idx on public.media (section_id) where section_id is not null;
create index media_iteration_idx on public.media (iteration_id) where iteration_id is not null;

alter table public.projects
  add constraint projects_cover_media_fk
  foreign key (cover_media_id) references public.media (id) on delete set null;

-- a section / iteration referenced by media must belong to the same project
create or replace function public.check_media_parent()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.section_id is not null and not exists (
    select 1 from public.project_sections
    where id = new.section_id and project_id = new.project_id
  ) then
    raise exception 'section % does not belong to project %', new.section_id, new.project_id;
  end if;
  if new.iteration_id is not null and not exists (
    select 1 from public.iterations
    where id = new.iteration_id and project_id = new.project_id
  ) then
    raise exception 'iteration % does not belong to project %', new.iteration_id, new.project_id;
  end if;
  return new;
end $$;

create trigger media_parent_check before insert or update on public.media
  for each row execute function public.check_media_parent();

create or replace function public.check_iteration_section()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.section_id is not null and not exists (
    select 1 from public.project_sections
    where id = new.section_id and project_id = new.project_id
  ) then
    raise exception 'section % does not belong to project %', new.section_id, new.project_id;
  end if;
  return new;
end $$;

create trigger iterations_section_check before insert or update on public.iterations
  for each row execute function public.check_iteration_section();

create or replace function public.check_cover_media()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.cover_media_id is not null and not exists (
    select 1 from public.media
    where id = new.cover_media_id and project_id = new.id and kind = 'image'
  ) then
    raise exception 'cover must be an image belonging to this project';
  end if;
  return new;
end $$;

create trigger projects_cover_check before insert or update of cover_media_id on public.projects
  for each row execute function public.check_cover_media();

-- ---------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------
create table public.tags (
  id    uuid primary key default gen_random_uuid(),
  name  text not null check (length(trim(name)) between 1 and 40)
);

create unique index tags_name_lower_idx on public.tags (lower(name));

create table public.project_tags (
  project_id uuid not null references public.projects (id) on delete cascade,
  tag_id     uuid not null references public.tags (id) on delete cascade,
  primary key (project_id, tag_id)
);

create index project_tags_tag_idx on public.project_tags (tag_id);

-- ---------------------------------------------------------------------
-- Touch the parent project whenever its children change, so
-- projects.updated_at reflects the latest edit anywhere in the case study
-- ---------------------------------------------------------------------
create or replace function public.touch_project()
returns trigger language plpgsql set search_path = '' as $$
begin
  update public.projects set updated_at = now()
  where id = coalesce(new.project_id, old.project_id);
  return null;
end $$;

create trigger project_sections_touch after insert or update or delete on public.project_sections
  for each row execute function public.touch_project();
create trigger iterations_touch after insert or update or delete on public.iterations
  for each row execute function public.touch_project();
create trigger outcomes_touch after insert or update or delete on public.outcomes
  for each row execute function public.touch_project();
create trigger media_touch after insert or update or delete on public.media
  for each row execute function public.touch_project();
create trigger project_tags_touch after insert or update or delete on public.project_tags
  for each row execute function public.touch_project();

-- ---------------------------------------------------------------------
-- RPCs. security invoker, so RLS still decides whether the caller may write.
-- ---------------------------------------------------------------------

-- Set sort_order from an ordered list of ids in one statement.
create or replace function public.reorder(p_table text, p_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_table not in ('projects', 'project_sections', 'iterations', 'outcomes', 'media') then
    raise exception 'cannot reorder %', p_table;
  end if;
  execute format(
    'update public.%I t set sort_order = o.ord
       from unnest($1) with ordinality as o(id, ord)
      where t.id = o.id', p_table)
  using p_ids;
end $$;

revoke all on function public.reorder(text, uuid[]) from public, anon;
grant execute on function public.reorder(text, uuid[]) to authenticated;

-- Replace a project's tags in one transaction. Tags match case-insensitively
-- and tags no project uses any more are removed.
create or replace function public.set_project_tags(p_project_id uuid, p_names text[])
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_names text[];
begin
  select coalesce(array_agg(d.n), '{}') into v_names
  from (
    select distinct on (lower(trim(x))) trim(x) as n
    from unnest(p_names) as x
    where length(trim(x)) > 0
  ) d;

  insert into public.tags (name)
  select x from unnest(v_names) as x
  on conflict ((lower(name))) do nothing;

  delete from public.project_tags pt
  where pt.project_id = p_project_id
    and pt.tag_id not in (
      select t.id from public.tags t
      where lower(t.name) in (select lower(x) from unnest(v_names) as x)
    );

  insert into public.project_tags (project_id, tag_id)
  select p_project_id, t.id from public.tags t
  where lower(t.name) in (select lower(x) from unnest(v_names) as x)
  on conflict do nothing;

  delete from public.tags t
  where not exists (select 1 from public.project_tags pt where pt.tag_id = t.id);
end $$;

revoke all on function public.set_project_tags(uuid, text[]) from public, anon;
grant execute on function public.set_project_tags(uuid, text[]) to authenticated;

-- =====================================================================
-- Row level security
--   anon + authenticated: read published projects and their children
--   admins: full access
-- =====================================================================
alter table public.admins            enable row level security;
alter table public.site_settings     enable row level security;
alter table public.projects          enable row level security;
alter table public.project_sections  enable row level security;
alter table public.iterations        enable row level security;
alter table public.outcomes          enable row level security;
alter table public.media             enable row level security;
alter table public.tags              enable row level security;
alter table public.project_tags      enable row level security;

-- admins: admins can see the list; nobody can write it through the API
-- (add admins in the SQL editor, which runs as the postgres role)
create policy "admins: admins read" on public.admins
  for select to authenticated using ((select public.is_admin()));

-- site settings
create policy "site_settings: public read" on public.site_settings
  for select to anon, authenticated using (true);
create policy "site_settings: admin update" on public.site_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- projects
create policy "projects: read published" on public.projects
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy "projects: admin write" on public.projects
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- child tables are visible when their project is
create or replace function public.project_is_visible(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and status = 'published'
  ) or public.is_admin();
$$;

revoke all on function public.project_is_visible(uuid) from public;
grant execute on function public.project_is_visible(uuid) to anon, authenticated;

create policy "project_sections: read visible" on public.project_sections
  for select to anon, authenticated using (public.project_is_visible(project_id));
create policy "project_sections: admin write" on public.project_sections
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "iterations: read visible" on public.iterations
  for select to anon, authenticated using (public.project_is_visible(project_id));
create policy "iterations: admin write" on public.iterations
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "outcomes: read visible" on public.outcomes
  for select to anon, authenticated using (public.project_is_visible(project_id));
create policy "outcomes: admin write" on public.outcomes
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "media: read visible" on public.media
  for select to anon, authenticated using (public.project_is_visible(project_id));
create policy "media: admin write" on public.media
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "tags: public read" on public.tags
  for select to anon, authenticated using (true);
create policy "tags: admin write" on public.tags
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "project_tags: read visible" on public.project_tags
  for select to anon, authenticated using (public.project_is_visible(project_id));
create policy "project_tags: admin write" on public.project_tags
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- =====================================================================
-- Storage: public-read bucket, admin-only writes.
-- Files are stored as <project_id>/<random>.<ext>. SVG is deliberately not
-- allowed: it can carry script and the bucket is served publicly.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-media', 'project-media', true,
  52428800, -- 50 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
        'video/mp4', 'video/webm']
)
on conflict (id) do nothing;

create policy "project-media: admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-media' and (select public.is_admin()));
create policy "project-media: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-media' and (select public.is_admin()));
create policy "project-media: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-media' and (select public.is_admin()));
create policy "project-media: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-media' and (select public.is_admin()));
