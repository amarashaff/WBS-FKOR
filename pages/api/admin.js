const memStore = global._wbsData || (global._wbsData = [])
const settingsStore = global._wbsSettings || (global._wbsSettings = {
  emailAdmin: 'wbs@fkor.uns.ac.id',
  emailCC: '',
})
if (!global._wbsSettings) global._wbsSettings = settingsStore

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fkor2026admin'

function hasSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.length > 0 && !url.includes('xxxxxxxxxxxx')
}

async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export default async function handler(req, res) {
  const adminPass = req.headers['x-admin-password']
  if (adminPass !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  // ── GET settings ──────────────────────────────
  if (req.method === 'GET' && req.query.type === 'settings') {
    return res.status(200).json(global._wbsSettings)
  }

  // ── POST settings (simpan email admin) ─────────
  if (req.method === 'POST' && req.query.type === 'settings') {
    const { emailAdmin, emailCC } = req.body || {}
    if (emailAdmin !== undefined) global._wbsSettings.emailAdmin = emailAdmin
    if (emailCC !== undefined) global._wbsSettings.emailCC = emailCC
    return res.status(200).json({ ok: true, settings: global._wbsSettings })
  }

  // ── GET semua pengaduan (admin) ─────────────────
  if (req.method === 'GET') {
    if (hasSupabase()) {
      try {
        const supabase = await getSupabase()
        const { data, error } = await supabase
          .from('pengaduan').select('*').order('created_at', { ascending: false })
        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json(data)
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }
    return res.status(200).json(memStore)
  }

  // ── PATCH update status/catatan ─────────────────
  if (req.method === 'PATCH') {
    const { id, status, catatan_evaluasi } = req.body || {}
    if (!id) return res.status(400).json({ error: 'ID diperlukan' })

    if (hasSupabase()) {
      try {
        const supabase = await getSupabase()
        const { error } = await supabase
          .from('pengaduan')
          .update({ status, catatan_evaluasi, updated_at: new Date().toISOString() })
          .eq('id', id)
        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json({ ok: true })
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }

    const idx = memStore.findIndex(d => d.id === id)
    if (idx !== -1) {
      memStore[idx].status = status
      memStore[idx].catatan_evaluasi = catatan_evaluasi
      memStore[idx].updated_at = new Date().toISOString()
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
