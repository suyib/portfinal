'use client'

import { useRef, useState } from 'react'
import { recordUpload } from '@/app/admin/actions'
import { MEDIA_BUCKET } from '@/lib/env'
import { createClient } from '@/lib/supabase/browser'

const MAX_BYTES = 50 * 1024 * 1024
const TYPES: Record<string, { kind: 'image' | 'video'; ext: string }> = {
  'image/png': { kind: 'image', ext: 'png' },
  'image/jpeg': { kind: 'image', ext: 'jpg' },
  'image/webp': { kind: 'image', ext: 'webp' },
  'image/gif': { kind: 'image', ext: 'gif' },
  'image/avif': { kind: 'image', ext: 'avif' },
  'video/mp4': { kind: 'video', ext: 'mp4' },
  'video/webm': { kind: 'video', ext: 'webm' },
}

type Option = { id: string; label: string }

async function dimensions(file: File, kind: 'image' | 'video') {
  try {
    if (kind === 'image') {
      const bmp = await createImageBitmap(file)
      const size = { width: bmp.width, height: bmp.height }
      bmp.close()
      return size
    }
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = url
    await new Promise((res, rej) => {
      video.onloadedmetadata = res
      video.onerror = rej
    })
    URL.revokeObjectURL(url)
    return { width: video.videoWidth || null, height: video.videoHeight || null }
  } catch {
    return { width: null, height: null }
  }
}

/** Uploads straight to Supabase Storage, then records the file via a server action. */
export function MediaUploader({
  projectId,
  sections,
  iterations,
}: {
  projectId: string
  sections: Option[]
  iterations: Option[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) return setStatus({ ok: false, message: 'Choose a file.' })

    const type = TYPES[file.type]
    if (!type) return setStatus({ ok: false, message: 'Use PNG, JPG, WebP, GIF, AVIF, MP4 or WebM.' })
    if (file.size > MAX_BYTES) return setStatus({ ok: false, message: 'Files must be under 50 MB.' })
    const alt = String(form.get('alt_text') ?? '').trim()
    if (type.kind === 'image' && !alt) {
      return setStatus({ ok: false, message: 'Add alt text describing the image.' })
    }

    setBusy(true)
    setStatus({ ok: true, message: 'Uploading…' })
    try {
      const path = `${projectId}/${crypto.randomUUID()}.${type.ext}`
      const { width, height } = await dimensions(file, type.kind)

      const { error } = await createClient()
        .storage.from(MEDIA_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
      if (error) throw new Error(error.message)

      const result = await recordUpload({
        project_id: projectId,
        kind: type.kind,
        storage_path: path,
        alt_text: alt,
        caption: String(form.get('caption') ?? ''),
        width,
        height,
        section_id: String(form.get('section_id') ?? ''),
        iteration_id: String(form.get('iteration_id') ?? ''),
      })
      setStatus({ ok: Boolean(result?.ok), message: result?.message ?? 'Done.' })
      if (result?.ok) formRef.current?.reset()
    } catch (err) {
      setStatus({ ok: false, message: `Upload failed: ${(err as Error).message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card space-y-3" aria-busy={busy}>
      <h3 className="font-medium">Upload image or video</h3>
      <input type="file" name="file" accept={Object.keys(TYPES).join(',')} required className="block text-sm" />
      <label className="block space-y-1">
        <span className="block text-sm font-medium">Alt text</span>
        <input name="alt_text" className="input" placeholder="What the image shows, for screen readers" />
      </label>
      <label className="block space-y-1">
        <span className="block text-sm font-medium">Caption</span>
        <input name="caption" className="input" />
      </label>
      <AttachSelects sections={sections} iterations={iterations} />
      <button className="btn" disabled={busy}>
        {busy ? 'Uploading…' : 'Upload'}
      </button>
      {status && (
        <p role="status" className={status.ok ? 'text-sm text-green-700' : 'text-sm text-red-700'}>
          {status.message}
        </p>
      )}
    </form>
  )
}

export function AttachSelects({
  sections,
  iterations,
  sectionId,
  iterationId,
}: {
  sections: Option[]
  iterations: Option[]
  sectionId?: string | null
  iterationId?: string | null
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block space-y-1">
        <span className="block text-sm font-medium">Show in section</span>
        <select name="section_id" defaultValue={sectionId ?? ''} className="input">
          <option value="">— Gallery (no section) —</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="block text-sm font-medium">Belongs to iteration</span>
        <select name="iteration_id" defaultValue={iterationId ?? ''} className="input">
          <option value="">— None —</option>
          {iterations.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
