// ── Supabase lazy client ──────────────────────────────────────────
let _client = null
let _checked = false

export function getDB() {
  if (_checked) return _client  // sudah pernah dicek, return hasil cache

  _checked = true

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  if (!url || !key) {
    console.error('[WBS] ❌ ENV KOSONG: NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan')
    console.error('[WBS] Data akan disimpan sementara di memory dan HILANG saat server restart')
    _client = null
    return null
  }

  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    console.error('[WBS] ❌ URL TIDAK VALID:', url)
    _client = null
    return null
  }

  try {
    const { createClient } = require('@supabase/supabase-js')
    _client = createClient(url, key, {
      auth: { persistSession: false }
    })
    console.log('[WBS] ✅ Supabase client berhasil dibuat:', url.slice(0,40))
    return _client
  } catch (e) {
    console.error('[WBS] ❌ createClient gagal:', e.message)
    _client = null
    return null
  }
}

// Reset cache (untuk hot reload dev)
export function resetDB() {
  _client = null
  _checked = false
}

// ── In-memory fallback ─────────────────────────────────────────────
if (!global._wbs) {
  global._wbs = {
    data: [],
    settings: { emailAdmin: 'muammar@staff.uns.ac.id', emailCC: '' }
  }
}

export const mem = {
  get data()     { return global._wbs.data },
  get settings() { return global._wbs.settings },
}
