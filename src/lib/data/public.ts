import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { CARD_SELECT, DETAIL_SELECT, toCard, toDetail } from './shape'
import { TAGS } from './tags'

// Public reads are cached indefinitely and invalidated on demand by the
// admin server actions, so visitors never wait on the database.

export async function getSiteSettings() {
  'use cache'
  cacheTag(TAGS.site)
  cacheLife('max')

  const { data, error } = await createPublicClient()
    .from('site_settings')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getPublishedProjects() {
  'use cache'
  cacheTag(TAGS.projects)
  cacheLife('max')

  const { data, error } = await createPublicClient()
    .from('projects')
    .select(CARD_SELECT)
    .eq('status', 'published')
    .order('sort_order')
    .order('published_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toCard)
}

export async function getPublishedProject(slug: string) {
  'use cache'
  cacheTag(TAGS.projects, TAGS.project(slug))
  cacheLife('max')

  const { data, error } = await createPublicClient()
    .from('projects')
    .select(DETAIL_SELECT)
    .eq('slug', slug.toLowerCase())
    .eq('status', 'published')
    .maybeSingle()
  if (error) throw error
  return data ? toDetail(data) : null
}
