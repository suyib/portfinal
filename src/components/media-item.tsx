import Image from 'next/image'
import type { Media } from '@/lib/data/types'
import { mediaSrc } from '@/lib/media'

export function MediaItem({ media: m, priority = false }: { media: Media; priority?: boolean }) {
  const src = mediaSrc(m)
  return (
    <figure className="space-y-2">
      {m.kind === 'image' &&
        (m.width && m.height ? (
          <Image
            src={src}
            alt={m.alt_text}
            width={m.width}
            height={m.height}
            sizes="(min-width: 768px) 768px, 100vw"
            priority={priority}
            className="h-auto w-full"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- dimensions unknown
          <img src={src} alt={m.alt_text} loading={priority ? 'eager' : 'lazy'} className="h-auto w-full" />
        ))}
      {m.kind === 'video' && (
        <video src={src} controls playsInline preload="metadata" className="h-auto w-full" aria-label={m.alt_text || undefined} />
      )}
      {m.kind === 'embed' && (
        <iframe
          src={src}
          title={m.alt_text || m.caption || 'Embedded content'}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          className="aspect-video w-full border"
        />
      )}
      {m.caption && <figcaption className="text-sm text-neutral-600">{m.caption}</figcaption>}
    </figure>
  )
}
