import { supabase } from '../../lib/db'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fkor2026admin'

function auth(req) {
  return req.headers['x-admin-password'] === ADMIN_PASSWORD
}

export default async function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { type } = req.query

  // ── GET settings ─────────────────────────────────────────────
  if (req.method === 'GET' && type === 'settings') {
    const { data, error } = await supabase
      .from('wbs_settings')
      .select('key, value')
    if (error) return res.status(500).json({ error: error.message })
    const settings = {}
    data.forEach(row => { settings[row.key] = row.value })
    return res.status(200).json(settings)
  }

  // ── POST settings ─────────────────────────────────────────────
  if (req.method === 'POST' && type === 'settings') {
    const { emailAdmin, emailCC } = req.body || {}
    const upserts = []
    if (emailAdmin !== undefined) upserts.push({ key: 'emailAdmin', value: emailAdmin, updated_at: new Date().toISOString() })
    if (emailCC    !== undefined) upserts.push({ key: 'emailCC',    value: emailCC,    updated_at: new Date().toISOString() })
    if (upserts.length === 0) return res.status(400).json({ error: 'Tidak ada data' })

    const { error } = await supabase.from('wbs_settings').upsert(upserts, { onConflict: 'key' })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // ── GET semua pengaduan (admin, termasuk email) ──────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('pengaduan')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // ── PATCH update status dan/atau catatan ─────────────────────
  if (req.method === 'PATCH') {
    const { id, status, catatan_evaluasi } = req.body || {}
    if (!id) return res.status(400).json({ error: 'ID diperlukan' })

    const update = { updated_at: new Date().toISOString() }
    if (status            !== undefined) update.status            = status
    if (catatan_evaluasi  !== undefined) update.catatan_evaluasi  = catatan_evaluasi

    const { error } = await supabase.from('pengaduan').update(update).eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // ── DELETE hapus laporan ─────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'ID diperlukan' })

    const { error } = await supabase.from('pengaduan').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
