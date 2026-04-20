import { supabase } from '../../lib/db'

const PUBLIC = 'id,kode,judul,kategori,unit,lokasi,tanggal_kejadian,prioritas,status,catatan_evaluasi,created_at'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { search, status, kategori } = req.query

  let q = supabase
    .from('pengaduan')
    .select(PUBLIC)
    .order('created_at', { ascending: false })

  if (status)   q = q.eq('status', status)
  if (kategori) q = q.ilike('kategori', `%${kategori}%`)
  if (search)   q = q.or(`judul.ilike.%${search}%,kode.ilike.%${search}%,kategori.ilike.%${search}%`)

  const { data, error } = await q
  if (error) {
    console.error('[WBS pengaduan]', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json(data)
}
