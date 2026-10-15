import type { Tables } from '@/lib/supabase/database.types'

export type Project = Tables<'projects'>
export type Section = Tables<'project_sections'>
export type Iteration = Tables<'iterations'>
export type Outcome = Tables<'outcomes'>
export type Media = Tables<'media'>
export type SiteSettings = Tables<'site_settings'>

export type SiteLink = { label: string; url: string }

export type ProjectCard = Pick<
  Project,
  'id' | 'slug' | 'title' | 'summary' | 'client' | 'role' | 'timeline' | 'featured' | 'status'
> & { cover: Media | null; tags: string[] }

export type ProjectDetail = Project & {
  cover: Media | null
  sections: Section[]
  iterations: Iteration[]
  outcomes: Outcome[]
  media: Media[]
  tags: string[]
}
