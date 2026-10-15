import 'server-only'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { CARD_SELECT, DETAIL_SELECT, toCard, toDetail } from './shape'

// Uncached reads for the admin area. Each one re-checks admin status and
// sees drafts, because RLS lets admins read everything.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function adminListProjects() {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('projects')
    .select(CARD_SELECT)
    .order('sort_order')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toCard)
}

export async function adminGetProject(id: string) {
  if (!UUID.test(id)) notFound()
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('projects')
    .select(DETAIL_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) notFound()
  return toDetail(data)
}

export async function adminGetSettings() {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('site_settings').select('*').single()
  if (error) throw error
  return data
}
