import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { CaseStudy } from '@/components/case-study'
import { getPublishedProject } from '@/lib/data/public'
import { mediaUrl } from '@/lib/media'

export async function generateMetadata({ params }: PageProps<'/work/[slug]'>): Promise<Metadata> {
  const project = await getPublishedProject((await params).slug)
  // resolved before the page streams, so unknown slugs get a real 404 status
  if (!project) notFound()
  const cover = project.cover?.storage_path ? mediaUrl(project.cover.storage_path) : undefined
  return {
    title: project.title,
    description: project.summary || undefined,
    openGraph: {
      title: project.title,
      description: project.summary || undefined,
      images: cover ? [{ url: cover, alt: project.cover?.alt_text }] : undefined,
    },
  }
}

// The slug is only known at request time, so the case study streams in behind
// a boundary. The data itself is cached ('use cache'), so this is fast.
export default function ProjectPage({ params }: PageProps<'/work/[slug]'>) {
  return (
    <>
      <Link href="/" className="text-sm underline">
        ← All work
      </Link>
      <div className="mt-6">
        <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
          <Project params={params} />
        </Suspense>
      </div>
    </>
  )
}

async function Project({ params }: Pick<PageProps<'/work/[slug]'>, 'params'>) {
  const project = await getPublishedProject((await params).slug)
  if (!project) notFound()
  return <CaseStudy project={project} />
}
