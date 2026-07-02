// ════════════════════════════════════════════════════════════════
// Cypher Cache — one-time user migration (Phase 7)
//
// Creates a Supabase Auth account for every existing clients row that
// doesn't have one yet, links it via clients.user_id, and prints a
// temporary password per account for you to distribute.
//
// The old password hashes are unusable by design (they were a weak
// 32-bit hash), so everyone gets a fresh temporary password. You can
// reset any of them later from the admin panel.
//
// Run from the project root (service role key: Supabase dashboard →
// Settings → API → service_role — NEVER commit it or put it in .env
// files that ship to the frontend):
//
//   SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node scripts/migrate-users.mjs
//
// Idempotent: rows that already have user_id are skipped, and if an
// auth user with the same email already exists it gets linked instead
// of failing.
// ════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment. See the header of this script.')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

// 12-char URL-safe temporary password.
const tempPassword = () => crypto.randomBytes(9).toString('base64url')

const findAuthUserByEmail = async (email) => {
  // Paginate defensively; rosters here are small.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error('listUsers failed: ' + error.message)
    const hit = data.users.find(u => (u.email ?? '').toLowerCase() === email)
    if (hit) return hit
    if (data.users.length < 200) return null
  }
  return null
}

const run = async () => {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, email, role, user_id')
    .order('created_at')
  if (error) { console.error('Could not read clients:', error.message); process.exit(1) }

  const results = []

  for (const c of clients) {
    const email = (c.email ?? '').trim().toLowerCase()

    if (c.user_id) { results.push({ ...c, status: 'already migrated' }); continue }
    if (!email) { results.push({ ...c, status: 'SKIPPED — no email set (add one in Supabase, then re-run)' }); continue }

    try {
      let userId = null
      let password = null

      const existing = await findAuthUserByEmail(email)
      if (existing) {
        userId = existing.id
      } else {
        password = tempPassword()
        const { data: created, error: cErr } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })
        if (cErr) throw new Error(cErr.message)
        userId = created.user.id
      }

      const { error: uErr } = await supabase.from('clients').update({ user_id: userId }).eq('id', c.id)
      if (uErr) throw new Error('linking failed: ' + uErr.message)

      results.push({ ...c, status: 'migrated', password: password ?? '(existing auth user — reset from admin panel if unknown)' })
    } catch (e) {
      results.push({ ...c, status: 'FAILED — ' + e.message })
    }
  }

  console.log('\n═══ Cypher Cache user migration ═══════════════════════════\n')
  for (const r of results) {
    const label = `${r.name || '(no name)'} <${r.email || 'no email'}> [${r.role}]`
    if (r.password) console.log(`✓ ${label}\n    temp password: ${r.password}\n`)
    else console.log(`• ${label} — ${r.status}\n`)
  }
  console.log('Distribute the temporary passwords securely (not by plain email if')
  console.log('avoidable) and encourage everyone to have you reset them on request.')
  console.log('The base admin (cypher@cypher.audio) is in the list above — that')
  console.log('temp password is YOUR new admin login.\n')
}

run()
