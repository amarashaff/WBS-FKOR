import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { search, status, kategori } = req.query

  let query = supabase
    .from('pengaduan')
    .select('id, kode, judul, kategori, unit, lokasi, tanggal_kejadian, prioritas, status, created_at')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (kategori) query = query.ilike('kategori', `%${kategori}%`)
  if (search) query = query.or(`judul.ilike.%${search}%,kode.ilike.%${search}%,kategori.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
