// src/lib/supabase.ts
//
// Browser-side Supabase client, used only for email verification during
// employer sign-up. It is NOT the system of record for accounts — Railway
// still owns the actual employer record, tasks, and login. Supabase's job
// here is narrow: prove someone owns the email address they typed, before
// that email is used to create a real BeyondX account.
//
// Required env vars (safe to expose in the browser — this is the public
// anon key, not the service role key used by the server-side /api functions):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseReady = Boolean(url && anonKey)

export const supabase = supabaseReady
  ? createClient(url as string, anonKey as string)
  : null
