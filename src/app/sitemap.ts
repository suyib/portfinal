import type { MetadataRoute } from 'next'
import { getPublishedProjects } from '@/lib/data/public'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL
  if (!base) return []
  const projects = await getPublishedProjects()
  return [
    { url: base, changeFrequency: 'monthly', priority: 1 },
    ...projects.map((p) => ({
      url: new URL(`/work/${p.slug}`, base).toString(),
      lastModified: p.updated_at,
      priority: 0.8,
    })),
  ]
}
