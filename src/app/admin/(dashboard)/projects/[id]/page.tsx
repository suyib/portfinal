import Link from 'next/link'
import { ActionButton, ActionForm, Field, Submit } from '@/components/admin/action-form'
import { AttachSelects, MediaUploader } from '@/components/admin/media-uploader'
import { RichText } from '@/components/admin/rich-text'
import { adminGetProject } from '@/lib/data/admin'
import type { Iteration, Media, Outcome, ProjectDetail, Section } from '@/lib/data/types'
import { mediaSrc } from '@/lib/media'
import { SECTION_KINDS } from '@/lib/validation'
import {
  addEmbed,
  deleteIteration,
  deleteMedia,
  deleteOutcome,
  deleteProject,
  deleteSection,
  moveIteration,
  moveMedia,
  moveOutcome,
  moveSection,
  saveIteration,
  saveOutcome,
  saveSection,
  setCover,
  setProjectStatus,
  updateMedia,
  updateProject,
} from '../../../actions'

export default async function EditProjectPage({ params }: PageProps<'/admin/projects/[id]'>) {
  const { id } = await params
  const project = await adminGetProject(id)

  const sectionOptions = project.sections.map((s) => ({ id: s.id, label: `${s.kind}: ${s.title}` }))
  const iterationOptions = project.iterations.map((i) => ({
    id: i.id,
    label: i.title ? `${i.label}: ${i.title}` : i.label,
  }))

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/admin" className="text-sm underline">
          ← Projects
        </Link>
        <h1 className="w-full text-2xl font-semibold">{project.title}</h1>
        <span className={`badge badge-${project.status}`}>{project.status}</span>
      </header>

      <nav className="flex flex-wrap gap-4 text-sm" aria-label="Jump to">
        <a href="#details">Details</a>
        <a href="#outcomes">Outcomes</a>
        <a href="#sections">Process</a>
        <a href="#iterations">Iterations</a>
        <a href="#media">Media</a>
        <a href="#danger">Delete</a>
      </nav>

      <DetailsForm project={project} />

      <Block id="outcomes" title="Outcomes" hint="Headline results, e.g. “+32%” / “task completion”.">
        {project.outcomes.map((o) => (
          <Item key={o.id} move={moveOutcome} remove={deleteOutcome} id={o.id} summary={`${o.value} — ${o.label}`}>
            <OutcomeForm projectId={project.id} outcome={o} />
          </Item>
        ))}
        <AddNew label="Add outcome">
          <OutcomeForm projectId={project.id} />
        </AddNew>
      </Block>

      <Block
        id="sections"
        title="Process"
        hint="The story of the project, in order: research, define, ideate, prototype, test…"
      >
        {project.sections.map((s) => (
          <Item key={s.id} move={moveSection} remove={deleteSection} id={s.id} summary={`${s.kind} · ${s.title}`}>
            <SectionForm projectId={project.id} section={s} />
          </Item>
        ))}
        <AddNew label="Add section">
          <SectionForm projectId={project.id} />
        </AddNew>
      </Block>

      <Block
        id="iterations"
        title="Iterations"
        hint="Each version of the design: what it was, what feedback showed, and what changed. Attach screens to an iteration in Media."
      >
        {project.iterations.map((it) => (
          <Item
            key={it.id}
            move={moveIteration}
            remove={deleteIteration}
            id={it.id}
            summary={it.title ? `${it.label} · ${it.title}` : it.label}
          >
            <IterationForm projectId={project.id} iteration={it} sections={project.sections} />
          </Item>
        ))}
        <AddNew label="Add iteration">
          <IterationForm projectId={project.id} sections={project.sections} />
        </AddNew>
      </Block>

      <Block id="media" title="Media" hint="Images, videos and embeds (Figma, YouTube, Loom…).">
        <div className="grid gap-4 md:grid-cols-2">
          <MediaUploader projectId={project.id} sections={sectionOptions} iterations={iterationOptions} />
          <ActionForm action={addEmbed} resetOnSuccess className="card space-y-3">
            <h3 className="font-medium">Add embed</h3>
            <input type="hidden" name="project_id" value={project.id} />
            <Field name="embed_url" label="Embed URL" hint="e.g. https://embed.figma.com/proto/…">
              <input name="embed_url" type="url" required className="input" />
            </Field>
            <Field name="alt_text" label="Title (for screen readers)">
              <input name="alt_text" className="input" />
            </Field>
            <Field name="caption" label="Caption">
              <input name="caption" className="input" />
            </Field>
            <AttachSelects sections={sectionOptions} iterations={iterationOptions} />
            <Submit>Add embed</Submit>
          </ActionForm>
        </div>

        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {project.media.map((m) => (
            <MediaCard
              key={m.id}
              media={m}
              isCover={project.cover_media_id === m.id}
              sections={sectionOptions}
              iterations={iterationOptions}
            />
          ))}
        </ul>
      </Block>

      <section id="danger" className="card space-y-3 border-red-300">
        <h2 className="text-lg font-semibold text-red-800">Delete project</h2>
        <p className="text-sm">
          Permanently deletes this project, all its sections, iterations, outcomes and uploaded files.
          Consider <em>archiving</em> it instead (bottom bar).
        </p>
        <ActionForm action={deleteProject} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={project.id} />
          <Field name="confirm" label={`Type “${project.slug}” to confirm`}>
            <input name="confirm" className="input" autoComplete="off" />
          </Field>
          <Submit className="btn-danger">Delete forever</Submit>
        </ActionForm>
      </section>

      <PublishBar project={project} />
    </div>
  )
}

// ---------------------------------------------------------------------

function Block({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {hint && <p className="text-sm text-neutral-600">{hint}</p>}
      {children}
    </section>
  )
}

type ItemAction = Parameters<typeof ActionButton>[0]['action']

function Item({
  id,
  summary,
  move,
  remove,
  children,
}: {
  id: string
  summary: string
  move: ItemAction
  remove: ItemAction
  children: React.ReactNode
}) {
  return (
    <details className="card">
      <summary className="flex cursor-pointer items-center gap-2">
        <span className="flex-1 font-medium">{summary}</span>
        <ActionButton action={move} fields={{ id, direction: 'up' }} title="Move up">
          ↑
        </ActionButton>
        <ActionButton action={move} fields={{ id, direction: 'down' }} title="Move down">
          ↓
        </ActionButton>
        <ActionButton action={remove} fields={{ id }} confirm={`Delete “${summary}”?`} className="btn-sm-danger">
          Delete
        </ActionButton>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}

function AddNew({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="card border-dashed">
      <summary className="cursor-pointer font-medium">+ {label}</summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}

/**
 * Pinned to the bottom of the screen so publishing is always one obvious,
 * separate step from saving. Saving never changes visibility.
 */
function PublishBar({ project: p }: { project: ProjectDetail }) {
  const preview = (
    <Link href={`/admin/projects/${p.id}/preview`} target="_blank" className="text-sm underline">
      Preview ↗
    </Link>
  )
  const setStatus = (status: 'draft' | 'published' | 'archived', label: string, className: string, confirm?: string) => (
    <ActionButton action={setProjectStatus} fields={{ id: p.id, status }} className={className} confirm={confirm}>
      {label}
    </ActionButton>
  )

  return (
    <div className="sticky-actions" role="region" aria-label="Publishing">
      {p.status === 'draft' && (
        <>
          <p className="mr-auto text-sm">
            <strong>Draft.</strong> Only you can see this project. Saved changes stay private until you publish.
          </p>
          {preview}
          {setStatus('archived', 'Archive', 'btn-sm')}
          {setStatus('published', 'Publish project', 'btn-publish')}
        </>
      )}
      {p.status === 'published' && (
        <>
          <p className="mr-auto text-sm">
            <strong className="text-green-800">Published.</strong> Saved changes go live straight away.
          </p>
          <Link href={`/work/${p.slug}`} target="_blank" className="text-sm underline">
            View live ↗
          </Link>
          {setStatus('draft', 'Unpublish', 'btn-sm', 'Take this project off the public site?')}
        </>
      )}
      {p.status === 'archived' && (
        <>
          <p className="mr-auto text-sm">
            <strong>Archived.</strong> Hidden from the site and kept for reference.
          </p>
          {preview}
          {setStatus('draft', 'Restore to draft', 'btn-sm')}
        </>
      )}
    </div>
  )
}

function DetailsForm({ project: p }: { project: ProjectDetail }) {
  return (
    <section id="details" className="space-y-3">
      <h2 className="text-xl font-semibold">Details</h2>
      <ActionForm action={updateProject} className="card space-y-4">
        <input type="hidden" name="id" value={p.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="title" label="Title">
            <input name="title" defaultValue={p.title} required className="input" />
          </Field>
          <Field name="slug" label="URL slug" hint="Changing this changes the public URL">
            <input name="slug" defaultValue={p.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className="input" />
          </Field>
        </div>
        <Field name="summary" label="Summary" hint="One or two sentences for the project card">
          <textarea name="summary" defaultValue={p.summary} rows={2} className="input" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="client" label="Client / company">
            <input name="client" defaultValue={p.client} className="input" />
          </Field>
          <Field name="role" label="My role">
            <input name="role" defaultValue={p.role} className="input" />
          </Field>
          <Field name="team" label="Team">
            <input name="team" defaultValue={p.team} className="input" />
          </Field>
          <Field name="timeline" label="Timeline">
            <input name="timeline" defaultValue={p.timeline} className="input" />
          </Field>
          <Field name="tools" label="Tools" hint="Comma separated">
            <input name="tools" defaultValue={p.tools.join(', ')} className="input" />
          </Field>
          <Field name="tags" label="Tags" hint="Comma separated, e.g. Research, Mobile">
            <input name="tags" defaultValue={p.tags.join(', ')} className="input" />
          </Field>
        </div>
        <Field as="div" name="problem" label="The problem">
          <RichText name="problem" label="The problem" defaultValue={p.problem} placeholder="What was the brief or challenge?" />
        </Field>
        <Field as="div" name="solution" label="The solution (TL;DR)">
          <RichText name="solution" label="The solution" defaultValue={p.solution} placeholder="The short answer, up top" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={p.featured} /> Featured
        </label>
        <Submit>Save details</Submit>
      </ActionForm>
    </section>
  )
}

function OutcomeForm({ projectId, outcome: o }: { projectId: string; outcome?: Outcome }) {
  return (
    <ActionForm action={saveOutcome} resetOnSuccess={!o} className="space-y-3">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="id" value={o?.id ?? ''} />
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <Field name="value" label="Value">
          <input name="value" defaultValue={o?.value} placeholder="+32%" required className="input" />
        </Field>
        <Field name="label" label="Label">
          <input name="label" defaultValue={o?.label} placeholder="task completion" required className="input" />
        </Field>
      </div>
      <Field name="detail" label="Detail">
        <input name="detail" defaultValue={o?.detail} className="input" />
      </Field>
      <Submit>{o ? 'Save' : 'Add'}</Submit>
    </ActionForm>
  )
}

function SectionForm({ projectId, section: s }: { projectId: string; section?: Section }) {
  return (
    <ActionForm action={saveSection} resetOnSuccess={!s} className="space-y-3">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="id" value={s?.id ?? ''} />
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <Field name="kind" label="Stage">
          <select name="kind" defaultValue={s?.kind ?? 'research'} className="input">
            {SECTION_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>
        <Field name="title" label="Heading">
          <input name="title" defaultValue={s?.title} required className="input" />
        </Field>
      </div>
      <Field as="div" name="body" label="Body">
        <RichText name="body" label="Section body" defaultValue={s?.body} minRows={8} />
      </Field>
      <Submit>{s ? 'Save section' : 'Add section'}</Submit>
    </ActionForm>
  )
}

function IterationForm({
  projectId,
  iteration: it,
  sections,
}: {
  projectId: string
  iteration?: Iteration
  sections: Section[]
}) {
  return (
    <ActionForm action={saveIteration} resetOnSuccess={!it} className="space-y-3">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="id" value={it?.id ?? ''} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field name="label" label="Label">
          <input name="label" defaultValue={it?.label} placeholder="v1" required className="input" />
        </Field>
        <Field name="title" label="Title">
          <input name="title" defaultValue={it?.title} className="input" />
        </Field>
        <Field name="iteration_date" label="Date">
          <input name="iteration_date" type="date" defaultValue={it?.iteration_date ?? ''} className="input" />
        </Field>
      </div>
      <Field name="section_id" label="Part of section">
        <select name="section_id" defaultValue={it?.section_id ?? ''} className="input">
          <option value="">— Iterations timeline —</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.kind}: {s.title}
            </option>
          ))}
        </select>
      </Field>
      <Field as="div" name="description" label="What this version was">
        <RichText name="description" label="What this version was" defaultValue={it?.description} />
      </Field>
      <Field as="div" name="feedback" label="What we learned" hint="Testing results, critique, data">
        <RichText name="feedback" label="What we learned" defaultValue={it?.feedback} />
      </Field>
      <Field as="div" name="changes" label="What changed as a result">
        <RichText name="changes" label="What changed as a result" defaultValue={it?.changes} />
      </Field>
      <Submit>{it ? 'Save iteration' : 'Add iteration'}</Submit>
    </ActionForm>
  )
}

function MediaCard({
  media: m,
  isCover,
  sections,
  iterations,
}: {
  media: Media
  isCover: boolean
  sections: { id: string; label: string }[]
  iterations: { id: string; label: string }[]
}) {
  const src = mediaSrc(m)
  return (
    <li className="card space-y-3">
      {m.kind === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
        <img src={src} alt={m.alt_text} className="aspect-video w-full rounded bg-neutral-100 object-contain" />
      )}
      {m.kind === 'video' && <video src={src} controls className="aspect-video w-full rounded bg-neutral-100" />}
      {m.kind === 'embed' && (
        <p className="truncate rounded bg-neutral-100 p-3 text-sm">
          Embed: <a href={src} className="underline" target="_blank" rel="noreferrer">{src}</a>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <ActionButton action={moveMedia} fields={{ id: m.id, direction: 'up' }} title="Move earlier">
          ←
        </ActionButton>
        <ActionButton action={moveMedia} fields={{ id: m.id, direction: 'down' }} title="Move later">
          →
        </ActionButton>
        {m.kind === 'image' &&
          (isCover ? (
            <ActionButton action={setCover} fields={{ project_id: m.project_id, media_id: '' }}>
              ★ Cover (remove)
            </ActionButton>
          ) : (
            <ActionButton action={setCover} fields={{ project_id: m.project_id, media_id: m.id }}>
              Set as cover
            </ActionButton>
          ))}
        <ActionButton action={deleteMedia} fields={{ id: m.id }} confirm="Delete this file?" className="btn-sm-danger">
          Delete
        </ActionButton>
      </div>
      <ActionForm action={updateMedia} className="space-y-3">
        <input type="hidden" name="id" value={m.id} />
        <input type="hidden" name="project_id" value={m.project_id} />
        <Field name="alt_text" label={m.kind === 'embed' ? 'Title' : 'Alt text'}>
          <input name="alt_text" defaultValue={m.alt_text} required={m.kind === 'image'} className="input" />
        </Field>
        <Field name="caption" label="Caption">
          <input name="caption" defaultValue={m.caption} className="input" />
        </Field>
        <AttachSelects
          sections={sections}
          iterations={iterations}
          sectionId={m.section_id}
          iterationId={m.iteration_id}
        />
        <Submit>Save</Submit>
      </ActionForm>
    </li>
  )
}
