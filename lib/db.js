// ── Lazy Supabase client ─────────────────────────────────────────
// Dibuat hanya saat pertama kali dipanggil, bukan saat module load.
// Ini mencegah crash "Invalid URL" saat env belum diset.

let _client = null

export function getDB() {
  if (_client) return _client

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  const ready = url.startsWith('https://') && url.includes('.supabase.co') && key.length > 20

  if (!ready) {
    console.warn('[WBS] Supabase env tidak lengkap — pakai mode demo (in-memory)')
    return null
  }

  const { createClient } = require('@supabase/supabase-js')
  _client = createClient(url, key)
  return _client
}

// ── In-memory store (fallback / demo) ────────────────────────────
if (!global._wbs) global._wbs = { data: [], settings: { emailAdmin: 'muammar@staff.uns.ac.id', emailCC: '' } }

export const mem = {
  get data()     { return global._wbs.data },
  get settings() { return global._wbs.settings },
}
