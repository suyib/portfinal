'use client'

import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/env'
import type { Database } from './database.types'

/** Browser client, used by the admin for direct-to-storage uploads. */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY)
}
