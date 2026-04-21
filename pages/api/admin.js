import { getDB, mem } from '../../lib/db'

const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD || 'fkor2026admin'
const DEFAULT_EMAIL   = 'muammar@staff.uns.ac.id'

function auth(req) {
  return req.headers['x-admin-password'] === ADMIN_PASSWORD
}

export default async function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { type } = req.query
  const db = getDB()

  // ── GET settings ─────────────────────────────────────────────
  if (req.method === 'GET' && type === 'settings') {
    if (db) {
      try {
        const { data } = await db.from('wbs_settings').select('key,value')
        if (data && data.length > 0) {
          const s = {}; data.forEach(r => { s[r.key] = r.value }); return res.status(200).json(s)
        }
      } catch(e) { console.error('[settings GET]', e.message) }
    }
    return res.status(200).json({ emailAdmin: mem.settings.emailAdmin || DEFAULT_EMAIL, emailCC: mem.settings.emailCC || '' })
  }

  // ── POST settings ─────────────────────────────────────────────
  if (req.method === 'POST' && type === 'settings') {
    const { emailAdmin, emailCC } = req.body || {}
    const ts = new Date().toISOString()
    if (db) {
      try {
        const upserts = []
        if (emailAdmin !== undefined) upserts.push({ key: 'emailAdmin', value: emailAdmin, updated_at: ts })
        if (emailCC    !== undefined) upserts.push({ key: 'emailCC',    value: emailCC,    updated_at: ts })
        if (upserts.length > 0) {
          const { error } = await db.from('wbs_settings').upsert(upserts, { onConflict: 'key' })
          if (error) return res.status(500).json({ error: error.message })
        }
        return res.status(200).json({ ok: true })
      } catch(e) { console.error('[settings POST Supabase]', e.message) }
    }
    // In-memory fallback
    if (emailAdmin !== undefined) mem.settings.emailAdmin = emailAdmin
    if (emailCC    !== undefined) mem.settings.emailCC    = emailCC
    return res.status(200).json({ ok: true })
  }

  // ── GET semua pengaduan ───────────────────────────────────────
  if (req.method === 'GET') {
    if (db) {
      try {
        const { data, error } = await db.from('pengaduan').select('*').order('created_at', { ascending: false })
        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json(data)
      } catch(e) { console.error('[admin GET]', e.message) }
    }
    return res.status(200).json(mem.data)
  }

  // ── PATCH update status / catatan ────────────────────────────
  if (req.method === 'PATCH') {
    const { id, status, catatan_evaluasi } = req.body || {}
    if (!id) return res.status(400).json({ error: 'ID diperlukan' })
    const upd = { updated_at: new Date().toISOString() }
    if (status           !== undefined) upd.status           = status
    if (catatan_evaluasi !== undefined) upd.catatan_evaluasi = catatan_evaluasi
    if (db) {
      try {
        const { error } = await db.from('pengaduan').update(upd).eq('id', id)
        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json({ ok: true })
      } catch(e) { console.error('[admin PATCH]', e.message) }
    }
    const idx = mem.data.findIndex(d => d.id === id)
    if (idx !== -1) Object.assign(mem.data[idx], upd)
    return res.status(200).json({ ok: true })
  }

  // ── DELETE hapus laporan ─────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id, bulkStatus } = req.body || {}
    if (db) {
      try {
        let q = db.from('pengaduan')
        if (bulkStatus) { const { error } = await q.delete().eq('status', bulkStatus); if (error) return res.status(500).json({ error: error.message }) }
        else if (id)    { const { error } = await q.delete().eq('id', id);             if (error) return res.status(500).json({ error: error.message }) }
        else return res.status(400).json({ error: 'id atau bulkStatus diperlukan' })
        return res.status(200).json({ ok: true })
      } catch(e) { console.error('[admin DELETE]', e.message) }
    }
    if (bulkStatus) { global._wbs.data = mem.data.filter(d => d.status !== bulkStatus) }
    else if (id)    { global._wbs.data = mem.data.filter(d => d.id     !== id) }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
