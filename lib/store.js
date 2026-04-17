// ── In-memory stores (fallback tanpa Supabase) ────────────────
if (!global._wbsData)     global._wbsData     = []
if (!global._wbsSettings) global._wbsSettings = { emailAdmin: 'wbs@fkor.uns.ac.id', emailCC: '' }

// ── Cek apakah Supabase sudah dikonfigurasi dengan benar ───────
export function isSupabaseReady() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  || ''
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const valid = (
    url.startsWith('https://') &&
    url.includes('.supabase.co') &&
    !url.includes('xxxxxxxxxxxx') &&
    key.length > 20
  )
  return valid
}

// ── Buat Supabase client (hanya dipanggil jika isSupabaseReady()) ──
export async function getClient() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
