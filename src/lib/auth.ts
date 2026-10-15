import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Data Access Layer gate for the admin area. Verifies the session with the
 * Auth server and checks the admins table. Call it at the top of every admin
 * page and server action; never rely on the proxy alone.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error || !isAdmin) redirect('/admin/login?error=not-admin')

  return { supabase, user }
}
