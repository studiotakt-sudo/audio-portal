import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail loudly and clearly on a deploy misconfig instead of surfacing as a
// cryptic fetch error deep inside the app.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Locally: check .env.local. On Vercel: Settings → Environment Variables, then redeploy.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// The columns a signed-in user fetches about THEMSELVES after login.
// (RLS restricts non-admins to their own row; private notes live in
// client_private, which only admins can read.)
export const CLIENT_SELF_COLS = 'id, name, email, role, user_id'

// Storage object keys choke on characters like #, %, ? and non-ASCII.
// Keep letters, digits, dot, dash, underscore; collapse the rest.
export function sanitizeFileName(name) {
  return (name || 'file')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')      // strip diacritics left by NFKD
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\.]+|_+$/g, '')
    || 'file'
}
