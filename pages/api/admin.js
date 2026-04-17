import { isSupabaseReady, getClient } from '../../lib/store'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fkor2026admin'

function auth(req) {
  return req.headers['x-admin-password'] === ADMIN_PASSWORD
}

export default async function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { type } = req.query

  // ── Settings GET ─────────────────────────────────────────────
  if (req.method === 'GET' && type === 'settings') {
    return res.status(200).json(global._wbsSettings || { emailAdmin: 'wbs@fkor.uns.ac.id', emailCC: '' })
  }

  // ── Settings POST ────────────────────────────────────────────
  if (req.method === 'POST' && type === 'settings') {
    const { emailAdmin, emailCC } = req.body || {}
    if (!global._wbsSettings) global._wbsSettings = {}
    if (emailAdmin !== undefined) global._wbsSettings.emailAdmin = emailAdmin
    if (emailCC    !== undefined) global._wbsSettings.emailCC    = emailCC
    return res.status(200).json({ ok: true, settings: global._wbsSettings })
  }

  // ── GET semua pengaduan (admin) ──────────────────────────────
  if (req.method === 'GET') {
    if (isSupabaseReady()) {
      try {
        const sb = await getClient()
        const { data, error } = await sb.from('pengaduan').select('*').order('created_at', { ascending: false })
        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json(data)
      } catch (e) {
        console.error('[WBS] admin GET fallback:', e.message)
      }
    }
    return res.status(200).json(global._wbsData || [])
  }

  // ── PATCH update status & catatan ───────────────────────────
  if (req.method === 'PATCH') {
    const { id, status, catatan_evaluasi } = req.body || {}
    if (!id) return res.status(400).json({ error: 'ID diperlukan' })

    if (isSupabaseReady()) {
      try {
        const sb = await getClient()
        const { error } = await sb
          .from('pengaduan')
          .update({ status, catatan_evaluasi, updated_at: new Date().toISOString() })
          .eq('id', id)
        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json({ ok: true })
      } catch (e) {
        console.error('[WBS] admin PATCH fallback:', e.message)
      }
    }

    // Fallback: update in-memory
    const store = global._wbsData || []
    const idx = store.findIndex(d => d.id === id)
    if (idx !== -1) {
      store[idx].status            = status
      store[idx].catatan_evaluasi  = catatan_evaluasi
      store[idx].updated_at        = new Date().toISOString()
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
