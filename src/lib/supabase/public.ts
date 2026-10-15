import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/env'
import type { Database } from './database.types'

/**
 * Anonymous, cookie-less client for public pages. Safe inside 'use cache'
 * because it never touches the request; RLS limits it to published content.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
