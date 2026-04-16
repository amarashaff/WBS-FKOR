import { supabase } from '../../lib/supabase'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fkor2026admin'

export default async function handler(req, res) {
  const adminPass = req.headers['x-admin-password']
  if (adminPass !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('pengaduan')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'PATCH') {
    const { id, status, catatan_evaluasi } = req.body
    if (!id) return res.status(400).json({ error: 'ID diperlukan' })
    const { error } = await supabase
      .from('pengaduan')
      .update({ status, catatan_evaluasi, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
