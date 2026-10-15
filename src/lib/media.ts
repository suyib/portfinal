import { MEDIA_BUCKET, SUPABASE_URL } from '@/lib/env'
import type { Tables } from '@/lib/supabase/database.types'

export function mediaUrl(storagePath: string) {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${encoded}`
}

export function mediaSrc(media: Pick<Tables<'media'>, 'kind' | 'storage_path' | 'embed_url'>) {
  if (media.kind === 'embed') return media.embed_url ?? ''
  return media.storage_path ? mediaUrl(media.storage_path) : ''
}
