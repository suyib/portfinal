'use server'

import { refresh, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { ActionState } from '@/lib/action-state'
import { requireAdmin } from '@/lib/auth'
import { TAGS } from '@/lib/data/tags'
import { MEDIA_BUCKET } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'
import {
  createProjectSchema,
  embedSchema,
  formToObject,
  iterationSchema,
  mediaUploadSchema,
  moveSchema,
  outcomeSchema,
  sectionSchema,
  settingsSchema,
  STATUSES,
  updateMediaSchema,
  updateProjectSchema,
} from '@/lib/validation'

// Every action re-checks admin status (requireAdmin) and validates its input
// with zod. RLS enforces the same rules again in the database.

type Supabase = Awaited<ReturnType<typeof requireAdmin>>['supabase']
type OrderedTable = 'projects' | 'project_sections' | 'iterations' | 'outcomes' | 'media'

const ok = (message?: string): ActionState => ({ ok: true, message })

function invalid(error: z.ZodError): ActionState {
  return {
    ok: false,
    message: 'Please fix the highlighted fields.',
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  }
}

function dbFail(error: { code?: string; message: string }): ActionState {
  console.error('[admin action]', error)
  if (error.code === '23505') {
    return { ok: false, message: 'That slug is already used.', fieldErrors: { slug: ['Already used by another project'] } }
  }
  if (error.code === '23514') return { ok: false, message: 'Some values were not accepted. Check the fields and try again.' }
  if (error.code === '42501') return { ok: false, message: 'You do not have permission to do that.' }
  return { ok: false, message: 'Something went wrong saving that. Please try again.' }
}

/** Expire every cached public read and re-render the admin page. */
function invalidate(...extra: string[]) {
  updateTag(TAGS.projects)
  for (const tag of extra) updateTag(tag)
  refresh()
}

async function nextSortOrder(supabase: Supabase, table: OrderedTable, projectId?: string) {
  let query = supabase.from(table).select('sort_order').order('sort_order', { ascending: false }).limit(1)
  if (projectId) query = query.filter('project_id', 'eq', projectId)
  const { data } = await query
  return ((data?.[0] as { sort_order: number } | undefined)?.sort_order ?? 0) + 1
}

async function move(table: OrderedTable, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = moveSchema.safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)
  const { id, direction } = parsed.data

  let projectId: string | null = null
  if (table !== 'projects') {
    const { data, error } = await supabase.from(table).select('project_id').eq('id', id).single()
    if (error) return dbFail(error)
    projectId = (data as { project_id: string }).project_id
  }

  let query = supabase.from(table).select('id').order('sort_order').order('created_at')
  if (projectId) query = query.filter('project_id', 'eq', projectId)
  const { data: rows, error } = await query
  if (error) return dbFail(error)

  const ids = (rows as { id: string }[]).map((r) => r.id)
  const i = ids.indexOf(id)
  const j = direction === 'up' ? i - 1 : i + 1
  if (i === -1 || j < 0 || j >= ids.length) return ok()
  ;[ids[i], ids[j]] = [ids[j], ids[i]]

  const { error: reorderError } = await supabase.rpc('reorder', { p_table: table, p_ids: ids })
  if (reorderError) return dbFail(reorderError)
  invalidate()
  return ok()
}

async function deleteById(table: OrderedTable, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { ok: false, message: 'Invalid id' }
  const { error } = await supabase.from(table).delete().eq('id', id.data)
  if (error) return dbFail(error)
  invalidate()
  return ok('Deleted.')
}

// ---------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ email: z.email('Enter your email'), password: z.string().min(1, 'Enter your password') })
    .safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { ok: false, message: 'Email or password is incorrect.' }

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) {
    await supabase.auth.signOut()
    return { ok: false, message: 'This account is not an admin.' }
  }

  // only redirect within the admin area
  const next = String(formData.get('next') ?? '')
  redirect(/^\/admin(\/[\w\-/]*)?$/.test(next) && next !== '/admin/login' ? next : '/admin')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

// ---------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = createProjectSchema.safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const { data, error } = await supabase
    .from('projects')
    .insert({ ...parsed.data, sort_order: await nextSortOrder(supabase, 'projects') })
    .select('id')
    .single()
  if (error) return dbFail(error)

  invalidate()
  redirect(`/admin/projects/${data.id}`)
}

export async function updateProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = updateProjectSchema.safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)
  const { id, tags, ...fields } = parsed.data

  const { data: before } = await supabase.from('projects').select('slug').eq('id', id).single()

  const { error } = await supabase.from('projects').update(fields).eq('id', id)
  if (error) return dbFail(error)

  const { error: tagError } = await supabase.rpc('set_project_tags', { p_project_id: id, p_names: tags })
  if (tagError) return dbFail(tagError)

  invalidate(TAGS.project(fields.slug), ...(before ? [TAGS.project(before.slug)] : []))
  return ok('Saved.')
}

export async function setProjectStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(STATUSES) })
    .safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const { error } = await supabase.from('projects').update({ status: parsed.data.status }).eq('id', parsed.data.id)
  if (error) return dbFail(error)
  invalidate()
  return ok(parsed.data.status === 'published' ? 'Published.' : `Moved to ${parsed.data.status}.`)
}

export async function deleteProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = z
    .object({ id: z.uuid(), confirm: z.string() })
    .safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const { data: project, error: readError } = await supabase
    .from('projects')
    .select('slug')
    .eq('id', parsed.data.id)
    .single()
  if (readError) return dbFail(readError)
  if (parsed.data.confirm.trim() !== project.slug) {
    return { ok: false, message: 'Type the slug exactly to confirm.', fieldErrors: { confirm: ['Does not match'] } }
  }

  // remove the project's files first, then the rows (children cascade)
  const storageError = await removeFolder(supabase, parsed.data.id)
  if (storageError) return { ok: false, message: `Could not delete files: ${storageError}` }

  const { error } = await supabase.from('projects').delete().eq('id', parsed.data.id)
  if (error) return dbFail(error)

  invalidate(TAGS.project(project.slug))
  redirect('/admin')
}

async function removeFolder(supabase: Supabase, folder: string) {
  const bucket = supabase.storage.from(MEDIA_BUCKET)
  for (;;) {
    const { data, error } = await bucket.list(folder, { limit: 1000 })
    if (error) return error.message
    if (!data?.length) return null
    const { error: removeError } = await bucket.remove(data.map((f) => `${folder}/${f.name}`))
    if (removeError) return removeError.message
    if (data.length < 1000) return null
  }
}

export async function moveProject(_prev: ActionState, formData: FormData) {
  return move('projects', formData)
}

// ---------------------------------------------------------------------
// Sections, iterations, outcomes (create when no id, else update)
// ---------------------------------------------------------------------

export async function saveSection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = sectionSchema.safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)
  const { id, ...fields } = parsed.data

  const { error } = id
    ? await supabase.from('project_sections').update(fields).eq('id', id).eq('project_id', fields.project_id)
    : await supabase.from('project_sections').insert({
        ...fields,
        sort_order: await nextSortOrder(supabase, 'project_sections', fields.project_id),
      })
  if (error) return dbFail(error)
  invalidate()
  return ok(id ? 'Section saved.' : 'Section added.')
}

export async function deleteSection(_prev: ActionState, formData: FormData) {
  return deleteById('project_sections', formData)
}
export async function moveSection(_prev: ActionState, formData: FormData) {
  return move('project_sections', formData)
}

export async function saveIteration(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = iterationSchema.safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)
  const { id, ...fields } = parsed.data

  const { error } = id
    ? await supabase.from('iterations').update(fields).eq('id', id).eq('project_id', fields.project_id)
    : await supabase.from('iterations').insert({
        ...fields,
        sort_order: await nextSortOrder(supabase, 'iterations', fields.project_id),
      })
  if (error) return dbFail(error)
  invalidate()
  return ok(id ? 'Iteration saved.' : 'Iteration added.')
}

export async function deleteIteration(_prev: ActionState, formData: FormData) {
  return deleteById('iterations', formData)
}
export async function moveIteration(_prev: ActionState, formData: FormData) {
  return move('iterations', formData)
}

export async function saveOutcome(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = outcomeSchema.safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)
  const { id, ...fields } = parsed.data

  const { error } = id
    ? await supabase.from('outcomes').update(fields).eq('id', id).eq('project_id', fields.project_id)
    : await supabase.from('outcomes').insert({
        ...fields,
        sort_order: await nextSortOrder(supabase, 'outcomes', fields.project_id),
      })
  if (error) return dbFail(error)
  invalidate()
  return ok(id ? 'Outcome saved.' : 'Outcome added.')
}

export async function deleteOutcome(_prev: ActionState, formData: FormData) {
  return deleteById('outcomes', formData)
}
export async function moveOutcome(_prev: ActionState, formData: FormData) {
  return move('outcomes', formData)
}

// ---------------------------------------------------------------------
// Media. Files go straight from the browser to Storage (no request-size
// limits on the server); this records the uploaded file.
// ---------------------------------------------------------------------

export async function recordUpload(input: Record<string, string | number | null>): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = mediaUploadSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  const { error } = await supabase.from('media').insert({
    ...parsed.data,
    sort_order: await nextSortOrder(supabase, 'media', parsed.data.project_id),
  })
  if (error) {
    // don't leave an orphaned file behind
    await supabase.storage.from(MEDIA_BUCKET).remove([parsed.data.storage_path])
    return dbFail(error)
  }
  invalidate()
  return ok('Uploaded.')
}

export async function addEmbed(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = embedSchema.safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const { error } = await supabase.from('media').insert({
    ...parsed.data,
    kind: 'embed',
    sort_order: await nextSortOrder(supabase, 'media', parsed.data.project_id),
  })
  if (error) return dbFail(error)
  invalidate()
  return ok('Embed added.')
}

export async function updateMedia(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = updateMediaSchema.safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)
  const { id, project_id, ...fields } = parsed.data

  const { error } = await supabase.from('media').update(fields).eq('id', id).eq('project_id', project_id)
  if (error) return dbFail(error)
  invalidate()
  return ok('Saved.')
}

export async function deleteMedia(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { ok: false, message: 'Invalid id' }

  const { data: media, error: readError } = await supabase
    .from('media')
    .select('storage_path')
    .eq('id', id.data)
    .single()
  if (readError) return dbFail(readError)

  const { error } = await supabase.from('media').delete().eq('id', id.data)
  if (error) return dbFail(error)

  if (media.storage_path) {
    const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove([media.storage_path])
    if (storageError) console.error('[deleteMedia] orphaned file', media.storage_path, storageError)
  }
  invalidate()
  return ok('Deleted.')
}

export async function moveMedia(_prev: ActionState, formData: FormData) {
  return move('media', formData)
}

export async function setCover(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = z
    .object({
      project_id: z.uuid(),
      media_id: z.string().transform((v) => (v === '' ? null : v)).pipe(z.uuid().nullable()),
    })
    .safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const { error } = await supabase
    .from('projects')
    .update({ cover_media_id: parsed.data.media_id })
    .eq('id', parsed.data.project_id)
  if (error) return dbFail(error)
  invalidate()
  return ok(parsed.data.media_id ? 'Cover set.' : 'Cover removed.')
}

// ---------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------

export async function updateSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = settingsSchema.safeParse(formToObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const { error } = await supabase.from('site_settings').update(parsed.data).eq('id', true)
  if (error) return dbFail(error)
  updateTag(TAGS.site)
  refresh()
  return ok('Saved.')
}
