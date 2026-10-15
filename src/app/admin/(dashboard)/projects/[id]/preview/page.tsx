import Link from 'next/link'
import { CaseStudy } from '@/components/case-study'
import { adminGetProject } from '@/lib/data/admin'

/** Renders the case study exactly as the public page will, drafts included. */
export default async function PreviewPage({ params }: PageProps<'/admin/projects/[id]/preview'>) {
  const { id } = await params
  const project = await adminGetProject(id)

  return (
    <div className="space-y-6">
      <p className="rounded bg-amber-100 p-3 text-sm">
        Preview of a <strong>{project.status}</strong> project.{' '}
        <Link href={`/admin/projects/${project.id}`} className="underline">
          Back to editing
        </Link>
      </p>
      <div className="mx-auto max-w-3xl">
        <CaseStudy project={project} />
      </div>
    </div>
  )
}
