import type { Media, ProjectDetail } from '@/lib/data/types'
import { Markdown } from './markdown'
import { MediaItem } from './media-item'

// Unstyled on purpose: structure only, ready for the real design.
// Order: header -> problem / solution -> outcomes -> process sections
// (with their iterations and media) -> iteration timeline -> gallery.

export function CaseStudy({ project: p }: { project: ProjectDetail }) {
  const mediaFor = (pred: (m: Media) => boolean) => p.media.filter(pred)
  const timeline = p.iterations.filter((it) => !it.section_id)
  const gallery = mediaFor((m) => !m.section_id && !m.iteration_id && m.id !== p.cover_media_id)

  const meta = [
    ['Client', p.client],
    ['Role', p.role],
    ['Team', p.team],
    ['Timeline', p.timeline],
    ['Tools', p.tools.join(', ')],
  ].filter(([, v]) => v)

  return (
    <article className="space-y-12">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold">{p.title}</h1>
        {p.summary && <p className="text-lg">{p.summary}</p>}
        {p.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm" aria-label="Tags">
            {p.tags.map((t) => (
              <li key={t} className="rounded border px-2">
                {t}
              </li>
            ))}
          </ul>
        )}
        {meta.length > 0 && (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {meta.map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm text-neutral-600">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {p.cover && <MediaItem media={p.cover} priority />}
      </header>

      {(p.problem || p.solution) && (
        <section className="grid gap-8 md:grid-cols-2">
          {p.problem && (
            <div>
              <h2 className="text-xl font-semibold">The problem</h2>
              <Markdown>{p.problem}</Markdown>
            </div>
          )}
          {p.solution && (
            <div>
              <h2 className="text-xl font-semibold">The solution</h2>
              <Markdown>{p.solution}</Markdown>
            </div>
          )}
        </section>
      )}

      {p.outcomes.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Outcomes</h2>
          <ul className="mt-4 grid gap-6 sm:grid-cols-3">
            {p.outcomes.map((o) => (
              <li key={o.id}>
                <div className="text-3xl font-semibold">{o.value}</div>
                <div>{o.label}</div>
                {o.detail && <p className="text-sm text-neutral-600">{o.detail}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.sections.map((s) => {
        const iterations = p.iterations.filter((it) => it.section_id === s.id)
        return (
          <section key={s.id} id={`section-${s.id}`} data-kind={s.kind} className="space-y-6">
            <p className="text-sm uppercase tracking-wide text-neutral-600">{s.kind}</p>
            <h2 className="text-2xl font-semibold">{s.title}</h2>
            <Markdown>{s.body}</Markdown>
            {mediaFor((m) => m.section_id === s.id && !m.iteration_id).map((m) => (
              <MediaItem key={m.id} media={m} />
            ))}
            {iterations.length > 0 && <Iterations items={iterations} media={p.media} />}
          </section>
        )
      })}

      {timeline.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Iterations</h2>
          <Iterations items={timeline} media={p.media} />
        </section>
      )}

      {gallery.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Gallery</h2>
          {gallery.map((m) => (
            <MediaItem key={m.id} media={m} />
          ))}
        </section>
      )}
    </article>
  )
}

function Iterations({ items, media }: { items: ProjectDetail['iterations']; media: Media[] }) {
  return (
    <ol className="space-y-10 border-l pl-6">
      {items.map((it) => (
        <li key={it.id} className="space-y-4">
          <h3 className="text-lg font-semibold">
            {it.label}
            {it.title && ` — ${it.title}`}
            {it.iteration_date && (
              <time dateTime={it.iteration_date} className="ml-2 text-sm font-normal text-neutral-600">
                {new Date(it.iteration_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </time>
            )}
          </h3>
          <Markdown>{it.description}</Markdown>
          {media
            .filter((m) => m.iteration_id === it.id)
            .map((m) => (
              <MediaItem key={m.id} media={m} />
            ))}
          {it.feedback && (
            <div>
              <h4 className="font-medium">What we learned</h4>
              <Markdown>{it.feedback}</Markdown>
            </div>
          )}
          {it.changes && (
            <div>
              <h4 className="font-medium">What changed</h4>
              <Markdown>{it.changes}</Markdown>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}
