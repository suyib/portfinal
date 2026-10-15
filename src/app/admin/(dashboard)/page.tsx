import Link from 'next/link'
import { ActionButton, ActionForm, Field, Submit } from '@/components/admin/action-form'
import { adminListProjects } from '@/lib/data/admin'
import { createProject, moveProject, setProjectStatus } from '../actions'

export default async function AdminProjectsPage() {
  const projects = await adminListProjects()

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Projects</h1>
        {projects.length === 0 ? (
          <p className="text-neutral-600">No projects yet. Create your first case study below.</p>
        ) : (
          <ol className="divide-y rounded border">
            {projects.map((p, i) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="flex gap-1">
                  <ActionButton action={moveProject} fields={{ id: p.id, direction: 'up' }} title="Move up">
                    ↑
                  </ActionButton>
                  <ActionButton action={moveProject} fields={{ id: p.id, direction: 'down' }} title="Move down">
                    ↓
                  </ActionButton>
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/projects/${p.id}`} className="font-medium underline">
                    {p.title}
                  </Link>
                  <div className="text-xs text-neutral-500">
                    /work/{p.slug} · updated {new Date(p.updated_at).toLocaleString('en-GB')}
                    {p.featured && ' · featured'}
                  </div>
                </div>
                <span className={`badge badge-${p.status}`}>{p.status}</span>
                {p.status === 'published' ? (
                  <ActionButton action={setProjectStatus} fields={{ id: p.id, status: 'draft' }}>
                    Unpublish
                  </ActionButton>
                ) : (
                  <ActionButton action={setProjectStatus} fields={{ id: p.id, status: 'published' }}>
                    Publish
                  </ActionButton>
                )}
                <span className="sr-only">Position {i + 1}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card max-w-xl space-y-4">
        <h2 className="text-lg font-semibold">New project</h2>
        <ActionForm action={createProject} className="space-y-3">
          <Field name="title" label="Title">
            <input name="title" required className="input" />
          </Field>
          <Field name="slug" label="URL slug" hint="Lowercase and hyphens, e.g. checkout-redesign">
            <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className="input" />
          </Field>
          <Submit>Create draft</Submit>
        </ActionForm>
      </section>
    </div>
  )
}
