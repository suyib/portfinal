import type { Json } from '@/lib/supabase/database.types'
import type { Media, ProjectCard, ProjectDetail, SiteLink } from './types'

// Shared select strings. media has two relationships to projects (its
// project_id and projects.cover_media_id), so each embed names its FK.
export const CARD_SELECT =
  'id, slug, title, summary, client, role, timeline, featured, status, sort_order, updated_at, ' +
  'cover:media!projects_cover_media_fk(*), project_tags(tags(name))'

export const DETAIL_SELECT =
  '*, cover:media!projects_cover_media_fk(*), ' +
  'sections:project_sections(*), iterations(*), outcomes(*), ' +
  'media:media!media_project_id_fkey(*), project_tags(tags(name))'

const bySortOrder = <T extends { sort_order: number; created_at?: string }>(a: T, b: T) =>
  a.sort_order - b.sort_order || (a.created_at ?? '').localeCompare(b.created_at ?? '')

type TagJoin = { project_tags?: { tags: { name: string } | null }[] | null }

function tagNames(row: TagJoin) {
  return (row.project_tags ?? [])
    .map((pt) => pt.tags?.name)
    .filter((n): n is string => Boolean(n))
    .sort((a, b) => a.localeCompare(b))
}

// supabase-js infers types for embedded selects, but aliased FK hints make
// those types brittle, so rows are shaped through these explicit mappers.
export function toCard(row: unknown): ProjectCard & { updated_at: string } {
  const r = row as ProjectCard & TagJoin & { updated_at: string }
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    client: r.client,
    role: r.role,
    timeline: r.timeline,
    featured: r.featured,
    status: r.status,
    updated_at: r.updated_at,
    cover: (r.cover as Media | null) ?? null,
    tags: tagNames(r),
  }
}

export function toDetail(row: unknown): ProjectDetail {
  const { project_tags, ...r } = row as ProjectDetail & TagJoin
  return {
    ...r,
    cover: r.cover ?? null,
    sections: [...(r.sections ?? [])].sort(bySortOrder),
    iterations: [...(r.iterations ?? [])].sort(bySortOrder),
    outcomes: [...(r.outcomes ?? [])].sort(bySortOrder),
    media: [...(r.media ?? [])].sort(bySortOrder),
    tags: tagNames({ project_tags }),
  }
}

export function parseLinks(links: Json): SiteLink[] {
  if (!Array.isArray(links)) return []
  return links.flatMap((l) =>
    l && typeof l === 'object' && !Array.isArray(l) &&
    typeof l.label === 'string' && typeof l.url === 'string'
      ? [{ label: l.label, url: l.url }]
      : [],
  )
}
