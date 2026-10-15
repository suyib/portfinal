import Link from 'next/link'
import { Markdown } from '@/components/markdown'
import { MediaItem } from '@/components/media-item'
import { getPublishedProjects, getSiteSettings } from '@/lib/data/public'

export default async function HomePage() {
  const [site, projects] = await Promise.all([getSiteSettings(), getPublishedProjects()])

  return (
    <div className="space-y-16">
      <section className="space-y-4">
        {site?.headline && <h1 className="text-3xl font-semibold">{site.headline}</h1>}
        {site?.bio && <Markdown>{site.bio}</Markdown>}
      </section>

      <section className="space-y-8" aria-labelledby="work">
        <h2 id="work" className="text-xl font-semibold">
          Work
        </h2>
        {projects.length === 0 && <p>Case studies coming soon.</p>}
        <ul className="space-y-12">
          {projects.map((p, i) => (
            <li key={p.id}>
              <Link href={`/work/${p.slug}`} className="block space-y-3">
                {p.cover && <MediaItem media={{ ...p.cover, caption: '' }} priority={i === 0} />}
                <h3 className="text-lg font-semibold underline">{p.title}</h3>
                {p.summary && <p>{p.summary}</p>}
                <p className="text-sm text-neutral-600">{[p.role, p.client, p.timeline].filter(Boolean).join(' · ')}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
