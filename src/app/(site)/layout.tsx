import Link from 'next/link'
import { getSiteSettings } from '@/lib/data/public'
import { parseLinks } from '@/lib/data/shape'

export default async function SiteLayout({ children }: LayoutProps<'/'>) {
  const site = await getSiteSettings()
  const links = site ? parseLinks(site.links) : []

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
      <header className="py-6">
        <Link href="/" className="font-semibold">
          {site?.name || 'Portfolio'}
        </Link>
      </header>
      <main className="flex-1 py-8">{children}</main>
      <footer className="flex flex-wrap gap-4 border-t py-6 text-sm">
        {site?.email && <a href={`mailto:${site.email}`}>{site.email}</a>}
        {site?.resume_url && <a href={site.resume_url}>CV</a>}
        {links.map((l) => (
          <a key={l.url} href={l.url} rel="me noreferrer">
            {l.label}
          </a>
        ))}
      </footer>
    </div>
  )
}
